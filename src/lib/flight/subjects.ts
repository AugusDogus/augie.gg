import { type Raster, checked, luminance } from "./art-maps";
import type { Gesture, Hand } from "./instrument";
import { type Point, rasterAt, valueAt } from "./route";
import { smoothstep } from "./streams";
import { hash } from "./texture";
import { ART_WIDTH } from "./viewport";

export type SubjectId =
  | "skyWhale"
  | "diver"
  | "glareFlock"
  | "shipFlock"
  | "spireFlock";
/** Luminance key level and matte widths in painting px. */
export type Matte = { below: number; dilate: number; feather: number };
type Rigged<Id extends SubjectId> = {
  id: Id;
  /** Painting px box holding the whole matte. Boxes are disjoint. */
  box: readonly [x0: number, y0: number, x1: number, y1: number];
  matte: Matte;
  /** Base stroke or hover period, s. */
  period: number;
  /** Stir reach R, px from the head-tip segment or the centre. */
  reach: number;
};
/** A painted whale whose flukes beat with a wave travelling from `rigid` along head to tip. */
type Flex = Rigged<"skyWhale" | "diver"> & {
  kind: "flex";
  head: Point;
  tip: Point;
  rigid: number;
  /** Phase lag in rad from `rigid` to the tip. */
  wave: number;
  /** Base amplitude, px. */
  amplitude: number;
};
/** A painted flock that hovers rigidly on a Lissajous path and shies from the hand. */
type Drift = Rigged<"glareFlock" | "shipFlock" | "spireFlock"> & {
  kind: "drift";
  centre: Point;
  sway: readonly [x: number, y: number];
  shy: number;
  /** Bound on |offset|, px. */
  limit: number;
};
/** Rig code k + 1 is SUBJECTS[k]; it also owns rig floats 2k and 2k + 1. */
export type Subject = Flex | Drift;

const flock = (
  id: Drift["id"],
  box: Drift["box"],
  below: number,
  centre: Point,
  period: number,
): Drift => ({
  id,
  kind: "drift",
  box,
  matte: { below, dilate: 4, feather: 12 },
  centre,
  sway: [2, 1],
  shy: 2.5,
  limit: 4,
  period,
  reach: 60,
});

export const SUBJECTS: readonly Subject[] = [
  {
    id: "skyWhale",
    kind: "flex",
    box: [954, 150, 1180, 252],
    matte: { below: 195, dilate: 7, feather: 20 },
    head: [1152, 214],
    tip: [979, 187],
    rigid: 0.45,
    wave: 2.2,
    amplitude: 4.5,
    period: 4.9,
    reach: 70,
  },
  {
    id: "diver",
    kind: "flex",
    box: [806, 90, 952, 180],
    matte: { below: 205, dilate: 6, feather: 18 },
    head: [942, 160],
    tip: [836, 118],
    // Every box cell inside the nav (911-1099, 66-106) has u < 0.476, so r = 0 there.
    rigid: 0.48,
    wave: 2.2,
    amplitude: 3.5,
    period: 3.7,
    reach: 60,
  },
  flock("glareFlock", [1044, 470, 1124, 532], 190, [1084, 500], 10.3),
  flock("shipFlock", [878, 184, 944, 246], 200, [910, 215], 13.9),
  // The box clears the key (bottom 298) by dilate + feather, so its edge ramp never meets the key ramp.
  flock("spireFlock", [1028, 254, 1096, 314], 195, [1060, 284], 17.3),
];
/** rig[0] = (phase, amp) skyWhale, (phase, amp) diver; rig[1] = glare, ship (dx, dy); rig[2] = spire (dx, dy), wake, 0. */
export const RIG_FLOATS = 12;
const WAKE_SLOT = 10;
/** Matte weight levels in the low 5 bits of a rig code. */
const LEVELS = 31;
/** Squared distance standing in for "no seed" in the transform. */
const FAR = 1e20;

function subjectAt(code: number): Subject {
  const subject = SUBJECTS[code - 1];
  if (!subject)
    throw new RangeError(
      `Rig code ${code} names no painted subject; codes run 1 to ${SUBJECTS.length}`,
    );
  return subject;
}

/** One row of the exact squared distance transform: the lower envelope of parabolas (Felzenszwalb and Huttenlocher). */
function envelope(
  f: Float64Array,
  n: number,
  out: Float64Array,
  v: Int32Array,
  z: Float64Array,
) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    const fq = rasterAt(f, q) + q * q;
    let p = rasterAt(v, k);
    let s = (fq - rasterAt(f, p) - p * p) / (2 * (q - p));
    while (s <= rasterAt(z, k)) {
      k--;
      p = rasterAt(v, k);
      s = (fq - rasterAt(f, p) - p * p) / (2 * (q - p));
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (rasterAt(z, k + 1) < q) k++;
    const p = rasterAt(v, k);
    out[q] = (q - p) * (q - p) + rasterAt(f, p);
  }
}

/** Exact squared Euclidean distance in cells from every cell to the nearest seed. */
function distances(seeds: Uint8Array, width: number, height: number) {
  const grid = Float64Array.from(seeds, (seed) => (seed ? 0 : FAR));
  const n = Math.max(width, height);
  const f = new Float64Array(n),
    out = new Float64Array(n),
    v = new Int32Array(n),
    z = new Float64Array(n + 1);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = rasterAt(grid, y * width + x);
    envelope(f, height, out, v, z);
    for (let y = 0; y < height; y++) grid[y * width + x] = rasterAt(out, y);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = rasterAt(grid, y * width + x);
    envelope(f, width, out, v, z);
    for (let x = 0; x < width; x++) grid[y * width + x] = rasterAt(out, x);
  }
  return grid;
}

/**
 * Cells outside the box (the grid's outer ring) and every 8-connected key
 * component that touches the box's own outer ring: paint that continues past
 * the box belongs to something else.
 */
function foreignCells(key: Uint8Array, width: number, height: number) {
  const foreign = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1)
        foreign[i] = 1;
      else if (
        (x === 1 || y === 1 || x === width - 2 || y === height - 2) &&
        rasterAt(key, i) &&
        !rasterAt(foreign, i)
      ) {
        foreign[i] = 1;
        stack.push(i);
      }
    }
  for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
    const x = i % width,
      y = (i - x) / width;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const j = (y + dy) * width + x + dx;
        if (rasterAt(key, j) && !rasterAt(foreign, j)) {
          foreign[j] = 1;
          stack.push(j);
        }
      }
  }
  return foreign;
}

/** 600x437 codes: 32 * code + round(31 * w), 0 where nothing moves. Row 0 is the painting top. */
export function rigMap(sample: Raster): Uint8Array {
  const { data, width, height } = checked(sample);
  const cell = ART_WIDTH / width;
  const codes = new Uint8Array(width * height);
  SUBJECTS.forEach(({ box, matte }, index) => {
    const [x0, y0, x1, y1] = box;
    const left = Math.max(0, Math.ceil(x0 / cell - 0.5)),
      right = Math.min(width, Math.ceil(x1 / cell - 0.5)),
      top = Math.max(0, Math.ceil(y0 / cell - 0.5)),
      bottom = Math.min(height, Math.ceil(y1 / cell - 0.5));
    // The box cells plus a one-cell ring outside them.
    const w = right - left + 2,
      h = bottom - top + 2;
    const key = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++)
        key[y * w + x] =
          luminance(data, (top + y - 1) * width + left + x - 1) < matte.below
            ? 1
            : 0;
    const foreign = foreignCells(key, w, h);
    const own = key.map((value, i) => (value && !rasterAt(foreign, i) ? 1 : 0));
    const toSubject = distances(own, w, h),
      toForeign = distances(foreign, w, h);
    const { dilate, feather } = matte;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const ds = cell * Math.sqrt(rasterAt(toSubject, i)),
          df = cell * Math.sqrt(rasterAt(toForeign, i));
        const weight = Math.max(
          0,
          Math.min(1, Math.min(dilate + feather - ds, df - 2) / feather),
        );
        const level = Math.round(LEVELS * weight);
        if (level > 0)
          codes[(top + y - 1) * width + left + x - 1] =
            (LEVELS + 1) * (index + 1) + level;
      }
  });
  return codes;
}

/** RGBA bytes for the cells texture: RGB = the baked lattice cells, A = rig code. */
export function rigCells(cells: Raster, codes: Uint8Array): Uint8Array {
  const { data, width, height } = checked(cells);
  if (codes.length !== width * height)
    throw new RangeError(
      `Expected ${width}x${height} rig codes, got ${codes.length}`,
    );
  const bytes = new Uint8Array(data);
  for (let i = 0; i < codes.length; i++) bytes[i * 4 + 3] = rasterAt(codes, i);
  return bytes;
}

/** TS mirror of the GLSL rigOffset(id, p) without the matte weight: displacement in painting px for subject `code` at painting px (x, y). */
export function rigOffset(
  code: number,
  x: number,
  y: number,
  rig: Float32Array,
  out: { x: number; y: number },
) {
  const subject = subjectAt(code);
  const a = valueAt(rig, 2 * code - 2),
    b = valueAt(rig, 2 * code - 1);
  if (subject.kind === "drift") {
    out.x = a;
    out.y = b;
    return out;
  }
  const [hx, hy] = subject.head,
    [tx, ty] = subject.tip;
  const length = Math.hypot(tx - hx, ty - hy),
    ax = (tx - hx) / length,
    ay = (ty - hy) / length;
  const u = ((x - hx) * ax + (y - hy) * ay) / length,
    r = smoothstep(subject.rigid, 1, u);
  const bend =
    b *
    r *
    r *
    Math.sin(a - (subject.wave * (u - subject.rigid)) / (1 - subject.rigid));
  out.x = -ay * bend;
  out.y = ax * bend;
  return out;
}

const float = (value: number) =>
  Number.isInteger(value) ? `${value}.` : `${value}`;

/** GLSL source defining `vec2 rigOffset(float id, vec2 p)`; it reads `uniform vec4 rig[3]`, declared by the composite. */
export function rigGlsl() {
  const branches = SUBJECTS.map((subject, index) => {
    const slot = `rig[${Math.floor(index / 2)}]`,
      [a, b] = index % 2 ? ["z", "w"] : ["x", "y"];
    const vec = ([x, y]: Point) => `vec2(${float(x)}, ${float(y)})`;
    const value =
      subject.kind === "flex"
        ? `rigFlex(p, ${vec(subject.head)}, ${vec(subject.tip)}, ${float(subject.rigid)}, ${float(subject.wave)}, ${slot}.${a}, ${slot}.${b})`
        : `${slot}.${a}${b}`;
    return index < SUBJECTS.length - 1
      ? `  if (id < ${float(index + 1.5)}) return ${value};`
      : `  return ${value};`;
  });
  return `
vec2 rigFlex(vec2 p, vec2 head, vec2 tip, float rigid, float wave, float phase, float amp) {
  vec2 axis = tip - head;
  float len = length(axis);
  axis /= len;
  float u = dot(p - head, axis) / len, r = smoothstep(rigid, 1., u);
  return vec2(-axis.y, axis.x) * amp * r * r * sin(phase - wave * (u - rigid) / (1. - rigid));
}
vec2 rigOffset(float id, vec2 p) {
${branches.join("\n")}
}`;
}

/** Pod's fixed tick, s. */
const STEP = 1 / 60;
const TAU = Math.PI * 2;
/** Seconds from t = 0 to full motion. */
const WAKE_UP = 2;
/** Gait of the gliding whale, and the seconds a new lead takes to take over. */
const GLIDE = 0.4,
  CROSSFADE = 1.2;
/** Stir gains on amplitude and rate, rise and fall time constants (s), and the hand speed (px/s) that snaps it to 1. */
const STIR = { amplitude: 0.4, rate: 0.6, rise: 0.4, fall: 2.5, snap: 300 };
const ease = (tau: number) => 1 - Math.exp(-STEP / tau);
const RISE = ease(STIR.rise),
  FALL = ease(STIR.fall),
  SHY_FOLLOW = ease(0.3),
  SHY_RELEASE = ease(2.5);

type Lead = Flex["id"];
const lead = (segment: number): Lead => (segment % 2 ? "diver" : "skyWhale");
/** Seconds segment k lasts: its lead's 2 or 3 strokes at the lead's base period. */
function segmentLength(segment: number) {
  const id = lead(segment);
  const subject = SUBJECTS.find((candidate) => candidate.id === id);
  if (!subject) throw new RangeError(`No painted subject ${id}`);
  return (2 + Math.floor(2 * hash(segment + 101))) * subject.period;
}

/** Px from (x, y) to the head-tip segment of a whale or the centre of a flock. */
function distance(subject: Subject, x: number, y: number) {
  if (subject.kind === "drift")
    return Math.hypot(x - subject.centre[0], y - subject.centre[1]);
  const [hx, hy] = subject.head,
    [tx, ty] = subject.tip;
  const ax = tx - hx,
    ay = ty - hy;
  const along = Math.max(
    0,
    Math.min(1, ((x - hx) * ax + (y - hy) * ay) / (ax * ax + ay * ay)),
  );
  return Math.hypot(x - hx - ax * along, y - hy - ay * along);
}

/**
 * Motion of the painted subjects on the pod's fixed clock. The whales take
 * turns: segment k is led by skyWhale when k is even and by diver when odd,
 * for 2-3 strokes, while the other glides. A near or fast hand stirs a subject.
 */
export class Subjects {
  private time = 0;
  private segment = 0;
  private start = 0;
  private end = segmentLength(0);
  private readonly phases = new Float64Array(SUBJECTS.length);
  private readonly stirs = new Float64Array(SUBJECTS.length);
  private readonly shy = new Float64Array(SUBJECTS.length * 2);

  /** Advance one fixed STEP (1/60 s) at simulation time `time` (s since t = 0; wake is 0 for time <= 0). */
  tick(time: number, hand: Hand, gestures: readonly Gesture[]) {
    this.time = time;
    while (time >= this.end) {
      this.start = this.end;
      this.end += segmentLength(++this.segment);
    }
    // Nothing advances before t = 0, so the poster frame is the painting at rest.
    if (time <= 0) return;
    for (let k = 0; k < SUBJECTS.length; k++) {
      const subject = subjectAt(k + 1);
      const stir = this.stir(k, subject, hand, gestures);
      const rate =
        subject.kind === "flex"
          ? (0.7 + 0.3 * this.gait(subject.id)) * (1 + STIR.rate * stir)
          : 1 + stir;
      this.phases[k] =
        (valueAt(this.phases, k) + (TAU / subject.period) * rate * STEP) % TAU;
      if (subject.kind === "drift") this.flinch(k, subject, hand, stir);
    }
  }

  /** Writes RIG_FLOATS without allocating. */
  write(out: Float32Array) {
    if (out.length !== RIG_FLOATS)
      throw new RangeError(
        `The rig uniform holds ${RIG_FLOATS} floats, got ${out.length}`,
      );
    const wake = smoothstep(0, WAKE_UP, this.time);
    for (let k = 0; k < SUBJECTS.length; k++) {
      const subject = subjectAt(k + 1),
        phase = valueAt(this.phases, k);
      if (subject.kind === "flex") {
        out[2 * k] = phase;
        out[2 * k + 1] =
          subject.amplitude *
          this.gait(subject.id) *
          (1 + STIR.amplitude * valueAt(this.stirs, k)) *
          wake;
        continue;
      }
      let dx =
          wake * subject.sway[0] * Math.sin(phase) + valueAt(this.shy, 2 * k),
        dy =
          wake * subject.sway[1] * Math.cos(1.3 * phase + 0.7) +
          valueAt(this.shy, 2 * k + 1);
      const size = Math.hypot(dx, dy);
      if (size > subject.limit) {
        dx *= subject.limit / size;
        dy *= subject.limit / size;
      }
      out[2 * k] = dx;
      out[2 * k + 1] = dy;
    }
    out[WAKE_SLOT] = wake;
    out[WAKE_SLOT + 1] = 0;
  }

  /** Drops stir and shy (pause, hidden tab). Phases and the conductor carry on. */
  calm() {
    this.stirs.fill(0);
    this.shy.fill(0);
  }

  /** 1 while leading, GLIDE while gliding, crossfading over CROSSFADE s at each change of lead. */
  gait(id: Lead) {
    const lift = (1 - GLIDE) * smoothstep(0, CROSSFADE, this.time - this.start);
    return id === lead(this.segment) ? GLIDE + lift : 1 - lift;
  }

  private stir(
    k: number,
    subject: Subject,
    hand: Hand,
    gestures: readonly Gesture[],
  ) {
    const reach = subject.reach;
    const near =
      hand.kind === "away" ? Infinity : distance(subject, hand.x, hand.y);
    const target = 1 - smoothstep(0.5 * reach, reach, near);
    let stir = valueAt(this.stirs, k);
    stir += (target - stir) * (target > stir ? RISE : FALL);
    if (
      hand.kind !== "away" &&
      near <= reach &&
      Math.hypot(hand.vx, hand.vy) > STIR.snap
    )
      stir = 1;
    for (const gesture of gestures)
      if (
        gesture.kind === "tap" &&
        distance(subject, gesture.x, gesture.y) <= reach
      )
        stir = 1;
    this.stirs[k] = stir;
    return stir;
  }

  /** Eases a flock's shy offset away from the hand, or back to 0 once the hand is gone. */
  private flinch(k: number, subject: Drift, hand: Hand, stir: number) {
    let x = 0,
      y = 0,
      rate = SHY_RELEASE;
    if (hand.kind !== "away") {
      const dx = subject.centre[0] - hand.x,
        dy = subject.centre[1] - hand.y,
        size = Math.hypot(dx, dy),
        push = subject.shy * stir;
      x = size > 0 ? (push * dx) / size : 0;
      y = size > 0 ? (push * dy) / size : -push;
      rate = SHY_FOLLOW;
    }
    const sx = valueAt(this.shy, 2 * k),
      sy = valueAt(this.shy, 2 * k + 1);
    this.shy[2 * k] = sx + (x - sx) * rate;
    this.shy[2 * k + 1] = sy + (y - sy) * rate;
  }
}
