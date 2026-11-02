import {
  ROUTE_SAMPLES,
  Route,
  type Point,
  type RouteFrame,
  valueAt,
} from "./route";
import { random } from "./texture";

export { ROUTE_SAMPLES };
export type StreamId = "high" | "under";
/** Draw order. */
export const STREAM_IDS: readonly StreamId[] = ["high", "under"];
export const WAKE_SLOTS = 8,
  BODY_SLOTS = 3,
  BEAD_FLOATS = 6;

const TAU = Math.PI * 2;
const SPACING = 2;
/** Shape terms the bead shader repeats as literals; change both together. */
export const WOBBLE = { amplitude: 0.5, wavelength: 170, rate: 0.27 } as const;
export const MEANDER = { amplitude: 1.2, wavelength: 41 } as const;
/** Wake bulge in px (also a shader literal), and pulse decay and life in s. */
export const WAKE = { lateral: 4, decay: 1.6, life: 4.8 } as const;

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
  /** Arcs over which whale coupling ramps from 0 to 1. */
  boost: readonly [number, number] | null;
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
    boost: [303, 390],
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
    boost: null,
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

const modulo = (value: number, size: number) => ((value % size) + size) % size;
export const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** Stroke records, packed as pulses that ride the current at its flow speed. */
export class WakeRing {
  static readonly CAPACITY = WAKE_SLOTS;
  private readonly arcs = new Float64Array(WAKE_SLOTS);
  private readonly times = new Float64Array(WAKE_SLOTS).fill(-Infinity);
  private readonly strengths = new Float64Array(WAKE_SLOTS);
  private next = 0;

  /** Overwrites the oldest record once all slots are used. */
  emit(s: number, time: number, strength: number) {
    this.arcs[this.next] = s;
    this.times[this.next] = time;
    this.strengths[this.next] = strength;
    this.next = (this.next + 1) % WAKE_SLOTS;
  }

  pack(time: number, flow: number, out: Float32Array) {
    for (let k = 0; k < WAKE_SLOTS; k++) {
      const age = time - valueAt(this.times, k);
      const live = age >= 0 && age <= WAKE.life;
      out[k * 4] = live ? valueAt(this.arcs, k) + flow * age : 0;
      out[k * 4 + 1] = live
        ? valueAt(this.strengths, k) * Math.exp(-age / WAKE.decay)
        : 0;
      out[k * 4 + 2] = live ? age : 0;
      out[k * 4 + 3] = 0;
    }
    return out;
  }
}

function beadAttributes(index: number, spec: StreamSpec) {
  const next = random(1607 + index);
  const fibers = spec.fibersPerSheet * 2;
  const perFiber = Math.floor((spec.span[1] - spec.span[0]) / SPACING);
  const beads = new Float32Array(fibers * perFiber * BEAD_FLOATS);
  let offset = 0;
  for (let f = 0; f < fibers; f++) {
    const n = spec.fibersPerSheet,
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
  readonly wakes = new WakeRing();
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
    this.twistRate = TAU / spec.twist.wavelength;
    this.swellRate = TAU / spec.swell.wavelength;
    this.foldPhase = modulo(
      Math.PI / 2 -
        spec.anchor * this.twistRate -
        WOBBLE.amplitude * Math.sin(spec.anchor / WOBBLE.wavelength),
      TAU,
    );
    const beads = beadAttributes(STREAM_IDS.indexOf(id), spec);
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
