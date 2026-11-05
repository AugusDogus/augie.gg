import type { Response } from "./attention";
import type { RouteFrame } from "./route";
import { type Stream, type StreamId, smoothstep } from "./streams";
import { ROOT_LAG } from "./whale-body";

const TAU = Math.PI * 2;
/** Airspeed relaxation time constant, s. */
const DRAG = 0.9;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export type SwimmerSpec = {
  stream: StreamId;
  /** Body length L, px. */
  length: number;
  /** Lane offset from the centerline, px; positive is ventral. */
  lane: number;
  /** Still-air cruise speed, px/s. */
  cruise: number;
  /** Airspeed given up when fully carried by the current. */
  relax: number;
  /** Still-air stroke period, s. */
  period: number;
  /** Wake strength per stroke. */
  wake: number;
  /** Nose x at t = 0. */
  startX: number;
  /** Stroke phase at the start of the pre-roll. */
  phase: number;
  /** Seconds of age over which opacity rises; 0 shows the whale at once. */
  fadeIn: number;
  /** Nose x over which opacity falls to 0, or null to stay opaque. */
  dissolve: readonly [number, number] | null;
};
export type StrokeEvent = { s: number; side: 1 | -1 };

/** Half-stroke count: it steps where φ − κ_r − π/2 crosses a multiple of π. */
const turn = (phase: number) =>
  Math.floor((phase - ROOT_LAG - Math.PI / 2) / Math.PI);
/** A stroke ends at each heave extreme of the fluke root. */
function stroke(before: number, after: number, s: number): StrokeEvent | null {
  if (turn(before) === turn(after)) return null;
  return { s, side: Math.sin(after - ROOT_LAG) >= 0 ? 1 : -1 };
}

const nose: RouteFrame = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };

/** A whale riding a current: momentum between tail strokes, a stroke rate that follows airspeed. */
export class Swimmer {
  air: number;
  /** This pass's lane; `lane` adds the mood's shift. */
  baseLane: number;
  lane: number;
  bend = 0;
  opacity = 1;
  cycle = 0;
  /** Stroke rate factor and current coupling factor from the mood. */
  private gain = 1;
  private carry = 1;

  constructor(
    readonly spec: SwimmerSpec,
    /** Nose arc. */
    public s: number,
    public phase: number,
    /** Seconds since the whale entered; negative while it waits hidden. */
    public age: number,
    air: number,
  ) {
    this.air = air;
    this.baseLane = spec.lane;
    this.lane = spec.lane;
  }

  get length() {
    return this.spec.length;
  }

  /** Stroke rate in rad/s before the mood's gain, proportional to airspeed: carried whales glide. */
  get pace() {
    const { cruise, period } = this.spec;
    return (TAU / period) * clamp(this.air / cruise, 0.6, 1.25);
  }

  get rate() {
    return this.pace * this.gain;
  }

  get hidden() {
    return this.opacity <= 0;
  }

  /** Applies a mood's response before the next step. */
  respond(response: Response) {
    this.lane = this.baseLane + response.laneShift;
    this.bend = response.bend;
    this.gain = response.rateGain;
    this.carry = response.coupling;
    this.air += response.airKick * this.spec.cruise;
  }

  step(h: number, stream: Stream): StrokeEvent | null {
    const { cruise, relax, length, fadeIn, dissolve } = this.spec;
    const carried = stream.coupling(this.s) * this.carry;
    // Both half-strokes push, strongest mid-stroke; drag smooths it into surge and glide.
    const target =
      cruise *
      (1 - relax * carried) *
      (0.88 + 0.24 * Math.cos(this.phase) ** 2);
    this.air += (target - this.air) * (1 - Math.exp(-h / DRAG));
    const before = this.phase;
    this.phase += this.rate * h;
    this.s += (this.air + carried * stream.spec.flow) * h;
    this.age += h;
    const x = stream.route.frame(this.s, nose).x;
    this.opacity =
      (fadeIn > 0 ? smoothstep(0, fadeIn, this.age) : 1) *
      (dissolve ? 1 - smoothstep(dissolve[0], dissolve[1], x) : 1);
    return stroke(before, this.phase, this.s - length);
  }

  /** Re-enter at arc s after `wait` hidden seconds; momentum and stroke phase carry over. */
  respawn(s: number, lane: number, wait = 0) {
    this.s = s;
    this.baseLane = lane;
    this.lane = lane;
    this.age = -wait;
    this.cycle++;
  }
}

export type CalfSpec = {
  length: number;
  wake: number;
  phase: number;
  /** Drafting slot a* behind the mother's nose: base + Σ amplitude·sin(2πt/period + phase), px. */
  slot: {
    base: number;
    terms: readonly (readonly [
      amplitude: number,
      period: number,
      phase: number,
    ])[];
  };
  /** Lane relative to the mother's: offset + amplitude·sin(2πt/period + phase), px. */
  lane: { offset: number; amplitude: number; period: number; phase: number };
  /** Damped spring on the lag: natural period, s, and damping ratio. */
  spring: { period: number; damping: number };
  /** Lag error (px) for full effort, and the stroke-rate gain at full effort. */
  effort: { scale: number; gain: number };
};

/** A calf drafting behind its mother on a damped spring; it strokes harder when it drops back. */
export class Calf {
  s: number;
  lag: number;
  lagRate = 0;
  lane: number;
  bend = 0;
  /** Last stroke rate, rad/s. */
  rate = 0;
  effort = 0;
  private shift = 0;
  private gain = 1;

  constructor(
    readonly spec: CalfSpec,
    mother: Swimmer,
    time: number,
    public phase: number,
  ) {
    this.lag = this.slot(time);
    this.s = mother.s - this.lag;
    this.lane = this.laneAt(time, mother);
  }

  get length() {
    return this.spec.length;
  }

  slot(time: number) {
    const { base, terms } = this.spec.slot;
    let sum = base;
    for (const term of terms)
      sum += term[0] * Math.sin((TAU * time) / term[1] + term[2]);
    return sum;
  }

  /** Beside the mother's base lane, so each whale's mood moves only itself. */
  private laneAt(time: number, mother: Swimmer) {
    const { offset, amplitude, period, phase } = this.spec.lane;
    return (
      mother.baseLane +
      offset +
      amplitude * Math.sin((TAU * time) / period + phase) +
      this.shift
    );
  }

  /** Applies a mood's response before the next step; the calf surges through its spring, not an impulse. */
  respond(response: Response) {
    this.shift = response.laneShift;
    this.bend = response.bend;
    this.gain = response.rateGain;
  }

  step(h: number, time: number, mother: Swimmer): StrokeEvent | null {
    const { spring, effort, length } = this.spec;
    const omega = TAU / spring.period;
    const target = this.slot(time);
    this.lagRate +=
      (omega * omega * (target - this.lag) -
        2 * spring.damping * omega * this.lagRate) *
      h;
    this.lag += this.lagRate * h;
    this.effort = clamp((this.lag - target) / effort.scale, -0.5, 1);
    this.rate =
      mother.pace *
      (mother.length / length) *
      (1 + effort.gain * this.effort) *
      this.gain;
    const before = this.phase;
    this.phase += this.rate * h;
    this.s = mother.s - this.lag;
    this.lane = this.laneAt(time, mother);
    return stroke(before, this.phase, this.s - length);
  }

  /** Re-enter with the mother, settled in the slot. */
  respawn(time: number, mother: Swimmer) {
    this.lag = this.slot(time);
    this.lagRate = 0;
    this.s = mother.s - this.lag;
    this.lane = this.laneAt(time, mother);
  }
}
