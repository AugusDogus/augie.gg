import {
  ROUTE_SAMPLES,
  Route,
  type Point,
  type RouteFrame,
  valueAt,
} from "./route";
import { random } from "./texture";

export { ROUTE_SAMPLES };
export type StreamId = "high" | "under" | "veil";
/** Draw order; bead seeds follow it, so new currents are appended. */
export const STREAM_IDS: readonly StreamId[] = ["high", "under", "veil"];
export const WHALE_WAKES = 8,
  PLUCK_RECORDS = 3,
  /** Whale wakes in slots 0..7, two pulses per pluck record in 8..13. */
  WAKE_SLOTS = WHALE_WAKES + 2 * PLUCK_RECORDS,
  BODY_SLOTS = 3,
  BEAD_FLOATS = 6;

const TAU = Math.PI * 2;
const SPACING = 2;
/** Shape terms the bead shader repeats as literals; change both together. */
export const WOBBLE = { amplitude: 0.5, wavelength: 170, rate: 0.27 } as const;
export const MEANDER = { amplitude: 1.2, wavelength: 41 } as const;
/** Wake bulge in px (also a shader literal), and pulse decay and life in s. */
export const WAKE = { lateral: 4, decay: 1.6, life: 4.8 } as const;
/** Pluck pulses: speed split from the flow, amplitude share, decay and life in s, packed age scale; and crossing detection. */
export const PLUCK = {
  split: 90,
  share: 0.7,
  decay: 1.4,
  life: 3.5,
  onset: 6,
  /** Extra sideways kink of a pluck pulse, px, on top of the shared wake bulge. */
  kink: 10,
  /** Normal speeds in px/s: below `threshold` nothing plucks, full strength at threshold + scale. */
  threshold: 150,
  scale: 500,
  /** Crossing band beyond the half width, px. */
  reach: 40,
  /** Per-stream refractory, s. */
  refractory: 0.3,
} as const;
/** The visitor's hand as a parting stone: band margin and speed limit, half length, heights and easing in s. */
export const PARTING = {
  margin: 12,
  speed: 250,
  length: 34,
  hover: 9,
  press: 12,
  rise: 0.25,
  fall: 0.3,
  /** Parting is held off this long after a pluck on the same stream, s. */
  hush: 0.3,
} as const;

export type StreamSpec = {
  controls: readonly Point[];
  /** Bead span as route arcs. */
  span: readonly [start: number, end: number];
  fade: readonly [fadeIn: number, fadeOut: number];
  halfWidth: number;
  fibersPerSheet: number;
  /** Bead flow V in px/s. */
  flow: number;
  twist: { wavelength: number; drift: number };
  swell: { amplitude: number; wavelength: number; speed: number };
  presence: { face: number; fold: number };
  /** Arc of a fold at t = 0. */
  anchor: number;
  /** Arcs where whales dissolve in. */
  gate: readonly [number, number] | null;
  /** Arcs where whales dissolve out. */
  exit: readonly [number, number] | null;
  /** Arcs over which whale coupling ramps from 0 to 1. */
  boost: readonly [number, number] | null;
  /** Mask layers that hide this current and its whales: near, wing, puffs. */
  behind: readonly [near: number, wing: number, puffs: number];
  /** Body slot the visitor's hand parts. */
  handSlot: number;
};

export const STREAMS: Readonly<Record<StreamId, StreamSpec>> = {
  under: {
    controls: [
      [200, 840],
      [330, 815],
      [450, 785],
      [580, 752],
      [720, 748],
      [860, 742],
      [1000, 734],
      [1120, 722],
      [1250, 708],
    ],
    span: [303, 1012],
    fade: [150, 60],
    halfWidth: 26,
    fibersPerSheet: 4,
    flow: 24,
    twist: { wavelength: 420, drift: 12 },
    swell: { amplitude: 5, wavelength: 640, speed: 10 },
    presence: { face: 0.55, fold: 1 },
    anchor: 782,
    gate: [315, 355],
    exit: null,
    boost: [303, 390],
    behind: [1, 0, 0],
    handSlot: 2,
  },
  high: {
    controls: [
      [-80, 128],
      [180, 118],
      [330, 108],
      [480, 100],
      [620, 92],
      [760, 91],
      [900, 112],
      [1040, 130],
    ],
    span: [400, 942],
    fade: [100, 120],
    halfWidth: 18,
    fibersPerSheet: 3,
    flow: 14,
    twist: { wavelength: 360, drift: 9 },
    swell: { amplitude: 4, wavelength: 400, speed: 6 },
    presence: { face: 0.5, fold: 1 },
    anchor: 531,
    gate: null,
    exit: null,
    boost: null,
    behind: [1, 0, 0],
    handSlot: 1,
  },
  veil: {
    controls: [
      [180, 470],
      [300, 490],
      [400, 518],
      [490, 558],
      [580, 565],
      [680, 566.5],
      [770, 566],
      [870, 560],
      [980, 552],
    ],
    span: [24, 736],
    fade: [110, 100],
    halfWidth: 18,
    fibersPerSheet: 3,
    flow: 11,
    twist: { wavelength: 380, drift: 7 },
    swell: { amplitude: 3, wavelength: 520, speed: 6 },
    presence: { face: 0.4, fold: 0.95 },
    anchor: 474,
    gate: [153, 205],
    exit: [676, 716],
    boost: null,
    behind: [0, 1, 1],
    handSlot: 1,
  },
};

/** Uploaded once. Layout matches the bead vertex shader uniforms and attributes. */
export type StreamStatic = {
  /** ROUTE_SAMPLES × (x, y, nx, ny) at arc i × step. */
  route: Float32Array;
  /** First bead arc, bead span, route sample step, fold phase. */
  range: Float32Array;
  /** Half width, route length, twist 2π/λ, swell 2π/λ. */
  shape: Float32Array;
  /** Fade-in px, fade-out px, face presence, fold presence. */
  look: Float32Array;
  swell: number;
  /** Mask layers (near, wing, puffs) that hide the beads. */
  behind: Float32Array;
  /** count × (v, sheet, arc0, hash, meander phase, strength). */
  beads: Float32Array;
  count: number;
};
/** Rewritten every frame in place. */
export type StreamFrame = {
  /** Flow offset mod span, twist, swell and wobble angles mod 2π. */
  clock: Float32Array;
  /** BODY_SLOTS × (centre arc, lane, half length, half height). */
  bodies: Float32Array;
  /** WAKE_SLOTS × (arc, signed decayed amplitude, age in s, 0). */
  wakes: Float32Array;
};

/** 2σ² of a pulse along the current, px²; a shader literal. */
const PULSE_SPREAD = 968;
const probe: RouteFrame = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
const modulo = (value: number, size: number) => ((value % size) + size) % size;
export const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** Stroke records, packed as pulses that ride the current at its flow speed. */
export class WakeRing {
  static readonly CAPACITY = WHALE_WAKES;
  private readonly arcs = new Float64Array(WHALE_WAKES);
  private readonly times = new Float64Array(WHALE_WAKES).fill(-Infinity);
  private readonly strengths = new Float64Array(WHALE_WAKES);
  private next = 0;

  /** Overwrites the oldest record once all slots are used. */
  emit(s: number, time: number, strength: number) {
    this.arcs[this.next] = s;
    this.times[this.next] = time;
    this.strengths[this.next] = strength;
    this.next = (this.next + 1) % WHALE_WAKES;
  }

  /** Writes CAPACITY slots starting at slot `offset`. */
  pack(time: number, flow: number, out: Float32Array, offset = 0) {
    for (let k = 0; k < WHALE_WAKES; k++) {
      const age = time - valueAt(this.times, k);
      const live = age >= 0 && age <= WAKE.life;
      const slot = (offset + k) * 4;
      out[slot] = live ? valueAt(this.arcs, k) + flow * age : 0;
      out[slot + 1] = live
        ? valueAt(this.strengths, k) * Math.exp(-age / WAKE.decay)
        : 0;
      out[slot + 2] = live ? age : 0;
      out[slot + 3] = 0;
    }
    return out;
  }
}

/** Plucks, each packed as two pulses that run downstream and upstream of the crossing like a struck string. */
export class PluckRing {
  static readonly CAPACITY = PLUCK_RECORDS;
  private readonly arcs = new Float64Array(PLUCK_RECORDS);
  private readonly times = new Float64Array(PLUCK_RECORDS).fill(-Infinity);
  private readonly strengths = new Float64Array(PLUCK_RECORDS);
  private next = 0;

  emit(s: number, time: number, strength: number) {
    this.arcs[this.next] = s;
    this.times[this.next] = time;
    this.strengths[this.next] = strength;
    this.next = (this.next + 1) % PLUCK_RECORDS;
  }

  /** Writes 2 × CAPACITY slots starting at slot `offset`; the packed age is scaled for a quick onset. */
  pack(time: number, flow: number, out: Float32Array, offset = WHALE_WAKES) {
    for (let k = 0; k < PLUCK_RECORDS; k++) {
      const age = time - valueAt(this.times, k);
      const live = age >= 0 && age <= PLUCK.life;
      const amplitude = live
        ? PLUCK.share *
          valueAt(this.strengths, k) *
          Math.exp(-age / PLUCK.decay)
        : 0;
      for (let q = 0; q < 2; q++) {
        const side = q === 0 ? 1 : -1,
          slot = (offset + 2 * k + q) * 4;
        out[slot] = live
          ? valueAt(this.arcs, k) + (flow + side * PLUCK.split) * age
          : 0;
        out[slot + 1] = amplitude;
        out[slot + 2] = live ? PLUCK.onset * age : 0;
        out[slot + 3] = 0;
      }
    }
    return out;
  }
}

/** Bead attributes for 2 × fibersPerSheet fibers with one bead per SPACING px of `span`. */
export function beadAttributes(
  seed: number,
  span: number,
  fibersPerSheet: number,
) {
  const next = random(seed);
  const fibers = fibersPerSheet * 2;
  const perFiber = Math.floor(span / SPACING);
  const beads = new Float32Array(fibers * perFiber * BEAD_FLOATS);
  let offset = 0;
  for (let f = 0; f < fibers; f++) {
    const n = fibersPerSheet,
      j = Math.floor(f / 2);
    const v = -1 + (2 * j + 1) / n + ((next() * 2 - 1) * 0.3) / n;
    const phase = TAU * next(),
      strength = 0.55 + 0.45 * next();
    for (let k = 0; k < perFiber; k++) {
      beads.set(
        [
          v,
          f % 2 ? 0.5 : -0.5,
          (k + next()) * SPACING,
          next(),
          phase,
          strength,
        ],
        offset,
      );
      offset += BEAD_FLOATS;
    }
  }
  return beads;
}

/** A twisted ribbon of bead fibers along a route. Bead positions are a pure function of time. */
export class Stream {
  readonly spec: StreamSpec;
  readonly route: Route;
  readonly start: number;
  readonly end: number;
  readonly foldPhase: number;
  readonly gate: readonly [number, number] | null;
  readonly exit: readonly [number, number] | null;
  readonly wakes = new WakeRing();
  readonly plucks = new PluckRing();
  readonly uniforms: StreamStatic;
  readonly frame: StreamFrame = {
    clock: new Float32Array(4),
    bodies: new Float32Array(BODY_SLOTS * 4),
    wakes: new Float32Array(WAKE_SLOTS * 4),
  };
  private readonly twistRate: number;
  private readonly swellRate: number;

  constructor(
    readonly id: StreamId,
    spec: StreamSpec = STREAMS[id],
  ) {
    this.spec = spec;
    this.route = new Route(spec.controls);
    [this.start, this.end] = spec.span;
    this.gate = spec.gate;
    this.exit = spec.exit;
    this.twistRate = TAU / spec.twist.wavelength;
    this.swellRate = TAU / spec.swell.wavelength;
    this.foldPhase = modulo(
      Math.PI / 2 -
        spec.anchor * this.twistRate -
        WOBBLE.amplitude * Math.sin(spec.anchor / WOBBLE.wavelength),
      TAU,
    );
    const beads = beadAttributes(
      1607 + STREAM_IDS.indexOf(id),
      this.end - this.start,
      spec.fibersPerSheet,
    );
    this.uniforms = {
      route: this.route.table,
      range: Float32Array.of(
        this.start,
        this.end - this.start,
        this.route.step,
        this.foldPhase,
      ),
      shape: Float32Array.of(
        spec.halfWidth,
        this.route.length,
        this.twistRate,
        this.swellRate,
      ),
      look: Float32Array.of(
        spec.fade[0],
        spec.fade[1],
        spec.presence.face,
        spec.presence.fold,
      ),
      swell: spec.swell.amplitude,
      behind: Float32Array.from(spec.behind),
      beads,
      count: beads.length / BEAD_FLOATS,
    };
    for (let k = 0; k < BODY_SLOTS; k++) this.frame.bodies[k * 4 + 2] = 1;
  }

  /** The route displaced by the travelling swell. The frame keeps the route's tangent. */
  centerline(s: number, time: number, out: RouteFrame): RouteFrame {
    this.route.frame(s, out);
    const swell =
      this.spec.swell.amplitude *
      Math.sin(
        s * this.swellRate - this.swellRate * this.spec.swell.speed * time,
      );
    out.x += out.nx * swell;
    out.y += out.ny * swell;
    return out;
  }

  halfWidth(s: number) {
    return (
      this.spec.halfWidth *
      (0.55 + 0.45 * Math.sin((Math.PI * s) / this.route.length))
    );
  }

  /** How strongly the current carries a whale at arc s. */
  coupling(s: number) {
    const boost = this.spec.boost;
    return boost ? smoothstep(boost[0], boost[1], s) : 1;
  }

  /** Arc and signed offset (positive ventral) of painting point (x, y) from the swelling centerline. */
  lateral(
    x: number,
    y: number,
    time: number,
    out: { s: number; d: number },
  ): { s: number; d: number } {
    const guess = this.route.arcAtX(x);
    const at = this.centerline(guess, time, probe);
    const s = guess + (x - at.x) * at.tx + (y - at.y) * at.ty;
    this.centerline(s, time, at);
    out.s = s;
    out.d = (x - at.x) * at.nx + (y - at.y) * at.ny;
    return out;
  }

  /** Whether arc s and offset d lie in the band, `margin` px past its half width. */
  holds(s: number, d: number, margin: number) {
    return (
      s >= this.start &&
      s <= this.end &&
      Math.abs(d) < this.halfWidth(s) + margin
    );
  }

  /** Kinks the current at arc s; the sign of `strength` is the side it is pushed toward. */
  pluck(s: number, strength: number, time: number) {
    this.plucks.emit(s, time, strength);
  }

  /** Sets the hand's parting body; a zero height frees the slot. */
  part(s: number, d: number, height: number) {
    const slot = this.spec.handSlot * 4,
      bodies = this.frame.bodies;
    const open = height > 0;
    bodies[slot] = open ? s : 0;
    bodies[slot + 1] = open ? d : 0;
    bodies[slot + 2] = open ? PARTING.length : 1;
    bodies[slot + 3] = open ? height : 0;
  }

  /** The bead shader's wake pulse at arc s for packed `wakes`, clamped to ±1 so WAKE.lateral bounds the bulge. */
  pulse(s: number, wakes: Float32Array) {
    let sum = 0;
    for (let k = 0; k < WAKE_SLOTS; k++) {
      const d = s - valueAt(wakes, k * 4);
      sum +=
        valueAt(wakes, k * 4 + 1) *
        smoothstep(0, 0.6, valueAt(wakes, k * 4 + 2)) *
        Math.exp((-d * d) / PULSE_SPREAD);
    }
    return Math.max(-1, Math.min(1, sum));
  }

  /** Ribbon twist angle without wake pulses; folds sit where cos is 0. */
  twist(s: number, time: number) {
    return (
      s * this.twistRate -
      this.twistRate * this.spec.twist.drift * time +
      this.foldPhase +
      WOBBLE.amplitude * Math.sin(s / WOBBLE.wavelength + WOBBLE.rate * time)
    );
  }

  /** Bead presence for a full-strength fiber, before the FM screen. */
  presence(s: number, time: number) {
    if (s < this.start || s > this.end) return 0;
    const local = s - this.start,
      span = this.end - this.start;
    const fold = (1 - Math.abs(Math.cos(this.twist(s, time)))) ** 6;
    const { face, fold: folded } = this.spec.presence;
    return (
      (face + (folded - face) * fold) *
      smoothstep(0, this.spec.fade[0], local) *
      (1 - smoothstep(span - this.spec.fade[1], span, local))
    );
  }

  /** Time terms reduced in double precision for the float32 shader. */
  clock(time: number, out: Float32Array) {
    out[0] = modulo(this.spec.flow * time, this.end - this.start);
    out[1] = modulo(this.twistRate * this.spec.twist.drift * time, TAU);
    out[2] = modulo(this.swellRate * this.spec.swell.speed * time, TAU);
    out[3] = modulo(WOBBLE.rate * time, TAU);
    return out;
  }
}
