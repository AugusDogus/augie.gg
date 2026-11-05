import { valueAt } from "./route";
import {
  BEAD_FLOATS,
  ROUTE_SAMPLES,
  WOBBLE,
  beadAttributes,
  smoothstep,
} from "./streams";
import { hash } from "./texture";

/** A press-drag ribbon: point spacing and cap, wind, widths, life and fades in s, bead and fold speeds. */
export const WISP = {
  spacing: 8,
  points: 64,
  arc: 520,
  wind: [18, -2],
  width: { live: 14, gust: 20 },
  life: 8,
  fade: [6, 8],
  /** A new press ends the previous gust this many s later. */
  cut: 0.8,
  flow: 16,
  drift: 6,
  twist: 300,
  presence: { face: 0.8, fold: 1 },
  /** Shorter ribbons are not drawn, px. */
  shortest: 24,
  behind: [1, 0, 1],
} as const;
/** One bead buffer, drawn once per wisp. */
export const WISP_BEADS = beadAttributes(1607 + 3, WISP.arc, 4);
export const WISP_COUNT = WISP_BEADS.length / BEAD_FLOATS;

/** Uniforms for one wisp draw, rewritten in place. Layouts match StreamStatic and StreamFrame. */
export type WispDraw = {
  visible: boolean;
  /** ROUTE_SAMPLES × (x, y, nx, ny), head at arc 0. */
  route: Float32Array;
  range: Float32Array;
  shape: Float32Array;
  look: Float32Array;
  clock: Float32Array;
  behind: Float32Array;
};

const TAU = Math.PI * 2;
const SUBDIVISIONS = 4;
const VERTICES = (WISP.points - 1) * SUBDIVISIONS + 1;
const modulo = (value: number, size: number) => ((value % size) + size) % size;
const polyline = new Float64Array(VERTICES * 2);
/** Uniform Catmull-Rom between b and c. */
const spline = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 *
  (2 * b +
    (c - a) * t +
    (2 * a - 5 * b + 4 * c - d) * t * t +
    (3 * b - a - 3 * c + d) * t * t * t);
const arcs = new Float64Array(VERTICES);

/** Up to 64 points riding the wind, newest (the head) first. While live, the hand lays a new head every WISP.spacing px. */
export class Trail {
  private readonly xs = new Float64Array(WISP.points);
  private readonly ys = new Float64Array(WISP.points);
  private readonly births = new Float64Array(WISP.points);
  private newest = 0;
  count = 0;
  /** Head travel, px: beads and folds keep their arc from it, so they stay put in the air. */
  odo = 0;
  live = false;
  /** Fold phase. */
  phase = 0;
  private cutAt = Infinity;
  private deadline = Infinity;

  private index(k: number) {
    return (this.newest - k + WISP.points) % WISP.points;
  }

  x(k: number) {
    return valueAt(this.xs, this.index(k));
  }

  y(k: number) {
    return valueAt(this.ys, this.index(k));
  }

  birth(k: number) {
    return valueAt(this.births, this.index(k));
  }

  private push(x: number, y: number, time: number) {
    this.newest = (this.newest + 1) % WISP.points;
    this.xs[this.newest] = x;
    this.ys[this.newest] = y;
    this.births[this.newest] = time;
    this.count = Math.min(this.count + 1, WISP.points);
  }

  begin(x: number, y: number, time: number, phase: number) {
    this.count = 0;
    this.odo = 0;
    this.phase = phase;
    this.live = true;
    this.cutAt = Infinity;
    this.deadline = Infinity;
    this.push(x, y, time);
  }

  /** Lays a new head at the hand once it is WISP.spacing px from the last, keeping at most WISP.arc px. */
  follow(x: number, y: number, time: number) {
    if (!this.live) return;
    const travel = Math.hypot(x - this.x(0), y - this.y(0));
    if (travel < WISP.spacing) return;
    this.odo += travel;
    this.push(x, y, time);
    let arc = 0;
    for (let k = 1; k < this.count; k++) {
      arc += Math.hypot(this.x(k) - this.x(k - 1), this.y(k) - this.y(k - 1));
      if (arc <= WISP.arc) continue;
      this.count = k;
      break;
    }
  }

  /** Lets go of the hand; from now on points die WISP.life s after birth, tail first. */
  release() {
    this.live = false;
  }

  /** Ends the trail WISP.cut s from `time`. */
  cut(time: number) {
    if (time + WISP.cut >= this.deadline) return;
    this.cutAt = time;
    this.deadline = time + WISP.cut;
  }

  advect(h: number, time: number) {
    for (let k = 0; k < this.count; k++) {
      const i = this.index(k);
      this.xs[i] = valueAt(this.xs, i) + WISP.wind[0] * h;
      this.ys[i] = valueAt(this.ys, i) + WISP.wind[1] * h;
    }
    if (this.live) return;
    while (
      this.count > 0 &&
      Math.min(this.birth(this.count - 1) + WISP.life, this.deadline) <= time
    )
      this.count--;
  }

  /** Presence factor: the gust fades as its head ages, or over a cut. */
  presence(time: number) {
    if (this.live || this.count === 0) return 1;
    const [from, to] = WISP.fade;
    const aged = 1 - smoothstep(from, to, time - this.birth(0));
    return this.deadline < Infinity
      ? aged * (1 - smoothstep(this.cutAt, this.deadline, time))
      : aged;
  }

  /** Resamples the points (Catmull-Rom) into ROUTE_SAMPLES equal arcs of (x, y, nx, ny), head first; returns the length. */
  write(table: Float32Array): number {
    const n = this.count;
    if (n < 2) return 0;
    let vertex = 0;
    for (let j = 0; j < n - 1; j++) {
      const a = Math.max(0, j - 1),
        c = j + 1,
        d = Math.min(n - 1, j + 2);
      for (let step = 0; step < SUBDIVISIONS; step++, vertex++) {
        const t = step / SUBDIVISIONS;
        polyline[vertex * 2] = spline(
          this.x(a),
          this.x(j),
          this.x(c),
          this.x(d),
          t,
        );
        polyline[vertex * 2 + 1] = spline(
          this.y(a),
          this.y(j),
          this.y(c),
          this.y(d),
          t,
        );
      }
    }
    polyline[vertex * 2] = this.x(n - 1);
    polyline[vertex * 2 + 1] = this.y(n - 1);
    const last = vertex;
    arcs[0] = 0;
    for (let v = 1; v <= last; v++)
      arcs[v] =
        valueAt(arcs, v - 1) +
        Math.hypot(
          valueAt(polyline, v * 2) - valueAt(polyline, v * 2 - 2),
          valueAt(polyline, v * 2 + 1) - valueAt(polyline, v * 2 - 1),
        );
    const length = valueAt(arcs, last);
    let cursor = 0;
    for (let i = 0; i < ROUTE_SAMPLES; i++) {
      const arc = (i * length) / (ROUTE_SAMPLES - 1);
      while (cursor < last - 1 && valueAt(arcs, cursor + 1) < arc) cursor++;
      const from = valueAt(arcs, cursor),
        span = valueAt(arcs, cursor + 1) - from;
      const t = span > 0 ? Math.min(1, (arc - from) / span) : 0;
      const x = valueAt(polyline, cursor * 2),
        y = valueAt(polyline, cursor * 2 + 1);
      table[i * 4] = x + (valueAt(polyline, cursor * 2 + 2) - x) * t;
      table[i * 4 + 1] = y + (valueAt(polyline, cursor * 2 + 3) - y) * t;
    }
    for (let i = 0; i < ROUTE_SAMPLES; i++) {
      const ahead = Math.min(ROUTE_SAMPLES - 1, i + 1),
        behind = Math.max(0, i - 1);
      const tx = valueAt(table, ahead * 4) - valueAt(table, behind * 4),
        ty = valueAt(table, ahead * 4 + 1) - valueAt(table, behind * 4 + 1);
      const size = Math.hypot(tx, ty);
      table[i * 4 + 2] = size > 0 ? -ty / size : 0;
      table[i * 4 + 3] = size > 0 ? tx / size : 1;
    }
    return length;
  }
}

/** Scratch route for measuring a released wisp. */
const measure = new Float32Array(ROUTE_SAMPLES * 4);
const blank = (): WispDraw => ({
  visible: false,
  route: new Float32Array(ROUTE_SAMPLES * 4),
  range: new Float32Array(4),
  shape: new Float32Array(4),
  look: new Float32Array(4),
  clock: new Float32Array(4),
  behind: Float32Array.from(WISP.behind),
});

/** The live wisp under a pressed hand and the gust it leaves behind. A wisp released while a cut gust still fades waits in the live slot, drawn as a gust. */
export class Wisps {
  private live = new Trail();
  private gust = new Trail();
  private serial = 0;
  /** [live, gust]; the same objects every write. */
  readonly draws: readonly [WispDraw, WispDraw] = [blank(), blank()];

  get drawing() {
    return this.live.live;
  }

  /** Starts a wisp at (x, y) and ends the previous gust soon. */
  begin(x: number, y: number, time: number) {
    this.release();
    // A waiting gust takes the slot now, ending the faded one it waited on.
    if (this.live.count > 0) this.swap();
    this.gust.cut(time);
    this.serial++;
    this.live.begin(x, y, time, TAU * hash(1607 + this.serial));
  }

  follow(x: number, y: number, time: number) {
    this.live.follow(x, y, time);
  }

  /** The live wisp becomes the gust once the previous gust is gone; one too short to draw is dropped. */
  release() {
    if (!this.live.live) return;
    this.live.release();
    if (this.live.write(measure) < WISP.shortest) this.live.count = 0;
    else if (this.gust.count === 0) this.swap();
  }

  tick(h: number, time: number) {
    this.live.advect(h, time);
    this.gust.advect(h, time);
    if (!this.live.live && this.live.count > 0 && this.gust.count === 0)
      this.swap();
  }

  write(time: number): readonly WispDraw[] {
    fill(this.draws[0], this.live, time);
    fill(this.draws[1], this.gust, time);
    return this.draws;
  }

  private swap() {
    const gust = this.live;
    this.live = this.gust;
    this.live.count = 0;
    this.gust = gust;
  }
}

function fill(draw: WispDraw, trail: Trail, time: number) {
  const length = trail.write(draw.route);
  draw.visible = length >= WISP.shortest;
  if (!draw.visible) return;
  const fade = trail.presence(time);
  const twist = TAU / WISP.twist;
  draw.range[0] = 0;
  draw.range[1] = WISP.arc;
  draw.range[2] = length / (ROUTE_SAMPLES - 1);
  draw.range[3] = trail.phase;
  draw.shape[0] = trail.live ? WISP.width.live : WISP.width.gust;
  draw.shape[1] = length;
  draw.shape[2] = twist;
  draw.shape[3] = 0;
  draw.look[0] = Math.min(24, 0.2 * length);
  draw.look[1] = Math.min(90, 0.4 * length);
  draw.look[2] = WISP.presence.face * fade;
  draw.look[3] = WISP.presence.fold * fade;
  draw.clock[0] = modulo(trail.odo + WISP.flow * time, WISP.arc);
  draw.clock[1] = modulo(twist * (trail.odo + WISP.drift * time), TAU);
  draw.clock[2] = 0;
  draw.clock[3] = modulo(WOBBLE.rate * time, TAU);
}
