import type { Hand } from "./instrument";
import { type RouteFrame, valueAt } from "./route";
import type { Stream } from "./streams";
import type { WhalePose } from "./whale-body";

/** Lengths are in units of k = L/170 px, speeds in painting px/s, times in s. */
export const ATTENTION = {
  curious: {
    reach: 160,
    behind: 60,
    ahead: 220,
    speed: 180,
    dwell: 0.35,
    hold: 5,
    aloof: 12,
    bend: 0.25,
    /** Lane shift toward the hand, in body lengths. */
    lane: 0.06,
    coupling: 0.55,
  },
  startle: {
    reach: 90,
    speed: 700,
    refractory: 6,
    hold: 3,
    /** Rate gain amplitude and decay: 2-3 extra half-strokes within 1.5 s. */
    gain: 4.5,
    decay: 0.6,
    bank: 8,
    flick: 10,
  },
  /** The calf startles after its mother. */
  follow: { delay: 0.2, intensity: 0.8 },
  /** A tap within `reach` body lengths of the spine flicks the flukes once. */
  tap: { reach: 0.2, intensity: 0.4, wake: 1.2 },
  bank: { period: 3, damping: 0.8 },
  head: { period: 0.8, damping: 0.7 },
} as const;
/** Spine samples at s − {0, .25, .5, .75, 1}·L. */
export const SPINE_SAMPLES = 5;

export type Mood =
  | { kind: "cruising" }
  | { kind: "curious"; since: number }
  | {
      kind: "startled";
      since: number;
      side: 1 | -1;
      intensity: number;
      bank: boolean;
    }
  | { kind: "aloof"; until: number };
/** Asked of the swimmer each tick. Neutral is exactly { 0, 0, 1, 0, 1 }. */
export type Response = {
  /** Lane offset from the pass's base lane, px; negative is dorsal. */
  laneShift: number;
  /** Rostrum offset, px. */
  bend: number;
  rateGain: number;
  /** One-tick airspeed impulse, in units of cruise. */
  airKick: number;
  /** Factor on how strongly the current carries the whale. */
  coupling: number;
};
/** Lane and bend ranges in px, relative to the pass's base lane. */
export type Limits = {
  lane: readonly [number, number];
  bend: readonly [number, number];
};
/** A whale as attention sees it this tick. */
export type Body = {
  length: number;
  /** False while the whale waits hidden or dissolves; it then ignores the hand. */
  visible: boolean;
  /** Track tangent and ventral normal at the rostrum. */
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  /** SPINE_SAMPLES × (x, y), rostrum first. */
  spine: Float64Array;
};
/** The hand's path since the last frame, for fast passes. */
export type Swipe = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  speed: number;
};

const TAU = Math.PI * 2;
const clamp = (value: number, [min, max]: readonly [number, number]) =>
  Math.max(min, Math.min(max, value));
/** The length unit k for a whale of `length` px. */
const unit = (length: number) => length / 170;

/** Distance from (x, y) to segment (ax, ay)–(bx, by). */
function toSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax,
    dy = by - ay,
    size = dx * dx + dy * dy;
  const t =
    size > 0
      ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / size))
      : 0;
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}

const frame: RouteFrame = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };

/** Fills `body` with the pose's rostrum frame and spine samples on its lane. */
export function locate(
  body: Body,
  pose: WhalePose,
  stream: Stream,
  time: number,
  visible: boolean,
) {
  body.length = pose.length;
  body.visible = visible;
  for (let i = 0; i < SPINE_SAMPLES; i++) {
    stream.centerline(
      pose.s - (i / (SPINE_SAMPLES - 1)) * pose.length,
      time,
      frame,
    );
    body.spine[i * 2] = frame.x + frame.nx * pose.lane;
    body.spine[i * 2 + 1] = frame.y + frame.ny * pose.lane;
    if (i > 0) continue;
    body.tx = frame.tx;
    body.ty = frame.ty;
    body.nx = frame.nx;
    body.ny = frame.ny;
  }
  return body;
}

export const emptyBody = (): Body => ({
  length: 0,
  visible: false,
  tx: 1,
  ty: 0,
  nx: 0,
  ny: 1,
  spine: new Float64Array(SPINE_SAMPLES * 2),
});

/** Distance from (x, y) to the body's spine polyline. */
export function spineDistance(body: Body, x: number, y: number) {
  const spine = body.spine;
  let nearest = Infinity;
  for (let i = 0; i + 1 < SPINE_SAMPLES; i++)
    nearest = Math.min(
      nearest,
      toSegment(
        x,
        y,
        valueAt(spine, i * 2),
        valueAt(spine, i * 2 + 1),
        valueAt(spine, i * 2 + 2),
        valueAt(spine, i * 2 + 3),
      ),
    );
  return nearest;
}

/** An underdamped spring toward a target, stepped exactly so an impulse peaks where it says. */
class Spring {
  value = 0;
  velocity = 0;
  private readonly omega: number;
  /** Damped angular frequency. */
  private readonly ring: number;

  constructor(
    period: number,
    private readonly damping: number,
  ) {
    this.omega = TAU / period;
    this.ring = this.omega * Math.sqrt(1 - damping * damping);
  }

  /** Velocity that peaks the free response at `height`. */
  impulse(height: number) {
    const { omega, damping } = this;
    const root = Math.sqrt(1 - damping * damping);
    const peak = Math.exp((-damping * Math.atan(root / damping)) / root);
    this.velocity += (height * omega) / peak;
  }

  /** The closed-form response over h with the target held. */
  step(h: number, target: number) {
    const { omega, damping, ring } = this;
    const offset = this.value - target,
      velocity = this.velocity,
      rate = damping * omega;
    const decay = Math.exp(-rate * h),
      cos = Math.cos(ring * h),
      sin = Math.sin(ring * h) / ring;
    this.value =
      target + decay * (offset * cos + (velocity + rate * offset) * sin);
    this.velocity =
      decay *
      (velocity * cos - (rate * velocity + omega * omega * offset) * sin);
    return this.value;
  }
}

/** A whale's moods: curious about a slow hand ahead of its nose, startled by a fast one, then aloof. */
export class Attention {
  mood: Mood = { kind: "cruising" };
  private dwell = 0;
  private refractory = -Infinity;
  private aloof = -Infinity;
  private pending: { at: number; side: 1 | -1; intensity: number } | null =
    null;
  private kick = 0;
  private readonly lane = new Spring(
    ATTENTION.bank.period,
    ATTENTION.bank.damping,
  );
  private readonly head = new Spring(
    ATTENTION.head.period,
    ATTENTION.head.damping,
  );
  private readonly response: Response = {
    laneShift: 0,
    bend: 0,
    rateGain: 1,
    airKick: 0,
    coupling: 1,
  };

  constructor(readonly limits: Limits) {}

  /** Advances one fixed step h at `time`. The returned object is reused. */
  tick(
    h: number,
    time: number,
    body: Body,
    hand: Hand,
    swipe: Swipe | null,
  ): Response {
    const k = unit(body.length);
    const { curious, startle } = ATTENTION;
    const sees = body.visible && hand.kind !== "away";
    if (this.pending && time >= this.pending.at - 1e-9) {
      const { side, intensity } = this.pending;
      this.pending = null;
      // A whale that startled on its own meanwhile skips the follow.
      if (this.ready(time)) this.startle(time, side, intensity, true, k);
    }
    if (
      swipe &&
      body.visible &&
      swipe.speed > startle.speed &&
      this.ready(time)
    ) {
      const side = this.passes(body, swipe, startle.reach * k);
      if (side !== 0) this.startle(time, side, 1, true, k);
    }

    let lateral = 0,
      near = false;
    if (sees) {
      const x = hand.x - valueAt(body.spine, 0),
        y = hand.y - valueAt(body.spine, 1);
      const along = x * body.tx + y * body.ty;
      lateral = x * body.nx + y * body.ny;
      near =
        Math.hypot(hand.vx, hand.vy) < curious.speed &&
        Math.hypot(x, y) < curious.reach * k &&
        along >= -curious.behind * k &&
        along <= curious.ahead * k;
    }
    const mood = this.mood;
    if (mood.kind === "startled" && time - mood.since >= startle.hold)
      this.settle(time);
    else if (mood.kind === "aloof" && time >= mood.until) this.settle(time);
    else if (mood.kind === "curious") {
      if (time - mood.since >= curious.hold) {
        this.aloof = time + curious.aloof;
        this.mood = { kind: "aloof", until: this.aloof };
      } else if (!near) this.settle(time);
    } else if (mood.kind === "cruising") {
      this.dwell = near ? this.dwell + h : 0;
      if (this.dwell >= curious.dwell - 1e-9) {
        this.dwell = 0;
        this.mood = { kind: "curious", since: time };
      }
    }

    const now = this.mood;
    let laneTarget = 0,
      bendTarget = 0;
    if (now.kind === "curious") {
      laneTarget = clamp(
        Math.sign(lateral) * curious.lane * body.length,
        this.limits.lane,
      );
      bendTarget = clamp(curious.bend * lateral, this.limits.bend);
    } else if (now.kind === "startled" && now.bank)
      laneTarget = clamp(
        now.side * startle.bank * k * now.intensity,
        this.limits.lane,
      );
    const r = this.response;
    r.laneShift = clamp(this.lane.step(h, laneTarget), this.limits.lane);
    r.bend = clamp(this.head.step(h, bendTarget), this.limits.bend);
    r.rateGain =
      now.kind === "startled"
        ? 1 +
          startle.gain *
            now.intensity *
            Math.exp(-(time - now.since) / startle.decay)
        : 1;
    r.airKick = this.kick;
    this.kick = 0;
    r.coupling = now.kind === "curious" ? curious.coupling : 1;
    return r;
  }

  /** A tap on the body of a `length` px whale: one weak startle without a bank, outside the refractory clock. */
  flick(time: number, side: 1 | -1, length: number) {
    this.startle(time, side, ATTENTION.tap.intensity, false, unit(length));
  }

  /** Startle `delay` s after a leader whose full startle began at `time`. */
  follow(leader: Attention, time: number) {
    const mood = leader.mood;
    if (mood.kind !== "startled" || mood.since !== time || !mood.bank) return;
    this.pending = {
      at: time + ATTENTION.follow.delay,
      side: mood.side,
      intensity: mood.intensity * ATTENTION.follow.intensity,
    };
  }

  /** Drops moods and pending startles; the springs relax from where they are. */
  calm() {
    this.mood = { kind: "cruising" };
    this.pending = null;
    this.dwell = 0;
    this.kick = 0;
  }

  private startle(
    time: number,
    side: 1 | -1,
    intensity: number,
    bank: boolean,
    k: number,
  ) {
    if (bank) this.refractory = time;
    this.mood = { kind: "startled", since: time, side, intensity, bank };
    this.kick = intensity;
    this.dwell = 0;
    this.head.impulse(side * ATTENTION.startle.flick * k * intensity);
  }

  /** Whether the startle refractory has run out. */
  private ready(time: number) {
    return time - this.refractory >= ATTENTION.startle.refractory;
  }

  private settle(time: number) {
    this.mood =
      time < this.aloof
        ? { kind: "aloof", until: this.aloof }
        : { kind: "cruising" };
  }

  /** The side away from the hand if the swipe passes within `reach` of a spine sample, else 0. */
  private passes(body: Body, swipe: Swipe, reach: number): 1 | -1 | 0 {
    for (let i = 0; i < SPINE_SAMPLES; i++) {
      const x = valueAt(body.spine, i * 2),
        y = valueAt(body.spine, i * 2 + 1);
      if (toSegment(x, y, swipe.x0, swipe.y0, swipe.x1, swipe.y1) >= reach)
        continue;
      const lateral = (swipe.x1 - x) * body.nx + (swipe.y1 - y) * body.ny;
      return lateral > 0 ? -1 : 1;
    }
    return 0;
  }
}
