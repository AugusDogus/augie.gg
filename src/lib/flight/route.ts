export type Point = readonly [x: number, y: number];
export type RouteFrame = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
};
export const ROUTE_SAMPLES = 64;
const DENSITY = 256;

/** Per-frame reads of float arrays; one-off passes over rasters use rasterAt. */
export function valueAt(values: ArrayLike<number>, index: number): number {
  const value = values[index];
  if (value === undefined)
    throw new RangeError(`Index ${index} is outside ${values.length} values`);
  return value;
}

/**
 * valueAt for the startup passes over byte rasters and integer grids. Every
 * caller of a function shares its one load, so these array types stay out of
 * valueAt's: past four, V8 turns it megamorphic and boxes every float the
 * per-frame code reads.
 */
export function rasterAt(values: ArrayLike<number>, index: number): number {
  const value = values[index];
  if (value === undefined)
    throw new RangeError(`Index ${index} is outside ${values.length} values`);
  return value;
}

/** Table value at `index`, interpolated toward the next sample's (4 floats on) by t. */
const lerp = (table: Float32Array, index: number, t: number) =>
  valueAt(table, index) +
  (valueAt(table, index + 4) - valueAt(table, index)) * t;

function control(controls: readonly Point[], index: number): Point {
  const point = controls[Math.max(0, Math.min(controls.length - 1, index))];
  if (!point) throw new RangeError(`Route control ${index} is missing`);
  return point;
}

/** Uniform Catmull-Rom with duplicated end points, at parameter u = segment + t. */
function spline(controls: readonly Point[], u: number) {
  const segment = Math.min(Math.floor(u), controls.length - 2);
  const t = u - segment;
  const [ax, ay] = control(controls, segment - 1),
    [bx, by] = control(controls, segment),
    [cx, cy] = control(controls, segment + 1),
    [dx, dy] = control(controls, segment + 2);
  const position = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (c - a) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (3 * b - a - 3 * c + d) * t * t * t);
  const slope = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (c -
      a +
      2 * (2 * a - 5 * b + 4 * c - d) * t +
      3 * (3 * b - a - 3 * c + d) * t * t);
  return {
    x: position(ax, bx, cx, dx),
    y: position(ay, by, cy, dy),
    dx: slope(ax, bx, cx, dx),
    dy: slope(ay, by, cy, dy),
  };
}

/** A left-to-right path resampled to equal arc steps, shared by the CPU and the bead shader. */
export class Route {
  readonly length: number;
  readonly step: number;
  /** ROUTE_SAMPLES × (x, y, nx, ny); the normal (−ty, tx) points down for rightward travel. */
  readonly table = new Float32Array(ROUTE_SAMPLES * 4);

  constructor(controls: readonly Point[]) {
    if (controls.length < 2)
      throw new RangeError("A route needs at least two control points");
    const count = (controls.length - 1) * DENSITY;
    const arcs = new Float64Array(count + 1);
    let previous = spline(controls, 0);
    for (let i = 1; i <= count; i++) {
      const next = spline(controls, i / DENSITY);
      arcs[i] =
        valueAt(arcs, i - 1) +
        Math.hypot(next.x - previous.x, next.y - previous.y);
      previous = next;
    }
    this.length = valueAt(arcs, count);
    this.step = this.length / (ROUTE_SAMPLES - 1);
    let cursor = 0;
    for (let i = 0; i < ROUTE_SAMPLES; i++) {
      const arc = Math.min(i * this.step, this.length);
      while (cursor < count - 1 && valueAt(arcs, cursor + 1) < arc) cursor++;
      const from = valueAt(arcs, cursor),
        to = valueAt(arcs, cursor + 1);
      const sample = spline(
        controls,
        (cursor + (arc - from) / (to - from)) / DENSITY,
      );
      const speed = Math.hypot(sample.dx, sample.dy);
      this.table.set(
        [sample.x, sample.y, -sample.dy / speed, sample.dx / speed],
        i * 4,
      );
    }
  }

  /** Linear between samples; past either end, a straight line along the end tangent. */
  frame(s: number, out: RouteFrame): RouteFrame {
    const f = s / this.step;
    const i = Math.max(0, Math.min(ROUTE_SAMPLES - 2, Math.floor(f)));
    const t = Math.max(0, Math.min(1, f - i)),
      a = i * 4,
      table = this.table;
    const nx = lerp(table, a + 2, t),
      ny = lerp(table, a + 3, t),
      size = Math.sqrt(nx * nx + ny * ny);
    const beyond = s < 0 ? s : Math.max(0, s - this.length);
    out.nx = nx / size;
    out.ny = ny / size;
    out.tx = out.ny;
    out.ty = -out.nx;
    out.x = lerp(table, a, t) + out.tx * beyond;
    out.y = lerp(table, a + 1, t) + out.ty * beyond;
    return out;
  }

  /** Inverts frame().x exactly, which is piecewise linear and increasing in s. */
  arcAtX(x: number): number {
    const last = (ROUTE_SAMPLES - 1) * 4;
    const first = valueAt(this.table, 0),
      end = valueAt(this.table, last);
    if (x <= first) return (x - first) / valueAt(this.table, 3);
    if (x >= end)
      return this.length + (x - end) / valueAt(this.table, last + 3);
    let i = 0;
    while (valueAt(this.table, (i + 1) * 4) < x) i++;
    const from = valueAt(this.table, i * 4),
      to = valueAt(this.table, i * 4 + 4);
    return (i + (x - from) / (to - from)) * this.step;
  }
}
