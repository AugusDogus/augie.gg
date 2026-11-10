import { type Haze, RIM } from "./art-maps";
import {
  ATTENTION,
  Attention,
  type Body,
  type Limits,
  type Mood,
  type Swipe,
  emptyBody,
  locate,
  spineDistance,
} from "./attention";
import { AWAY, type Gesture, type Hand, STILL, type Sense } from "./instrument";
import { type RouteFrame, valueAt } from "./route";
import { hash } from "./texture";
import {
  PARTING,
  PLUCK,
  Stream,
  type StreamFrame,
  type StreamId,
} from "./streams";
import { RIG_FLOATS } from "./subjects";
import { type WispDraw, Wisps } from "./trail";
import {
  VERTEX_FLOATS,
  WHALE_VERTICES,
  type WhalePose,
  spineVertex,
  writeWhale,
} from "./whale-body";
import {
  Calf,
  type CalfSpec,
  type StrokeEvent,
  Swimmer,
  type SwimmerSpec,
} from "./whale-swim";

export const STEP = 1 / 60,
  PREROLL = 4,
  WHALE_COUNT = 4;
/** Respawn the mother once the calf's rearmost arc is past this x. */
const EXIT_X = 1184;
/** Spine node whose position picks the whale's air colour. */
const MIDBODY = 14;
/** Tint from open air: this far past the gate, and this far before the exit. */
const CLEAR = { gate: 100, exit: 80 } as const;
const NO_GATE = [-1e4, -1e4 + 1] as const;
const NO_EXIT = [1e4, 1e4 + 1] as const;
/** A tap plucks the nearest current within this many px, pushing it away at this strength. */
const TAP = { reach: 120, strength: 0.9 } as const;
/** A press that starts in a band plucks it on release at this strength, toward the hand. */
const RELEASE = 0.8;

/** When a hidden whale comes back: after a hashed wait, or once its leader's nose crosses x (dropped if it is still visible `hold` s later). */
export type Cue =
  | { kind: "wait"; base: number; spread: number }
  | { kind: "after"; leader: "hero"; x: number; hold: number };

type Lead = SwimmerSpec & {
  /** Aerial haze, 0 near to 1 far. */
  haze: number;
  /** Arc where the whale re-enters. */
  entry: number;
  cue: Cue;
  /** Lane jitter per pass, ± px. Pass 0 is exact. */
  jitter: number;
};

export const POD = {
  hero: {
    stream: "under",
    length: 170,
    lane: -14,
    jitter: 3,
    cruise: 16,
    relax: 0.35,
    period: 3.4,
    wake: 1,
    haze: 0,
    startX: 930,
    phase: 1.2,
    entry: 305,
    cue: { kind: "wait", base: 0.2, spread: 0.4 },
    fadeIn: 0,
    dissolve: null,
  },
  calf: {
    length: 96,
    haze: 0.12,
    wake: 0.6,
    phase: 2.6,
    slot: {
      base: 210,
      terms: [
        [12, 23, 0],
        [5, 9.1, 1.3],
      ],
    },
    lane: { offset: 8, amplitude: 3, period: 17, phase: 0.4 },
    spring: { period: 6, damping: 0.6 },
    effort: { scale: 18, gain: 0.6 },
  },
  far: {
    stream: "high",
    length: 64,
    lane: -6,
    jitter: 0,
    cruise: 6,
    relax: 0.35,
    period: 4.5,
    wake: 0.5,
    haze: 1,
    startX: 600,
    phase: 0.4,
    entry: 480,
    cue: { kind: "wait", base: 1, spread: 1 },
    fadeIn: 2,
    dissolve: [700, 790],
  },
  drift: {
    stream: "veil",
    // Its parting body (0.13·L + 3 px) has to fit the veil between the ship's fringe and y 600.
    length: 100,
    lane: -6,
    jitter: 2,
    cruise: 14,
    relax: 0.2,
    period: 3.6,
    wake: 0.7,
    haze: 0.25,
    startX: 310,
    phase: 2,
    entry: 150,
    cue: { kind: "after", leader: "hero", x: 900, hold: 3 },
    fadeIn: 0,
    dissolve: [900, 940],
  },
} as const satisfies {
  hero: Lead;
  calf: CalfSpec & { haze: number };
  far: Lead;
  drift: Lead;
};

/** Mood limits relative to each pass's base lane, px; hero and calf keep clear of the caption. */
export const LIMITS = {
  hero: { lane: [-10, 0], bend: [-12, 2] },
  calf: { lane: [-10, 0], bend: [-12, 2] },
  far: { lane: [-4, 4], bend: [-4.5, 4.5] },
  drift: { lane: [-8, 6], bend: [-8, 8] },
} as const satisfies Record<"hero" | "calf" | "far" | "drift", Limits>;

export type WhaleDraw = {
  /** First vertex index (not float offset) of this whale in SkyFrame.vertices. */
  first: number;
  /** Linear 0..1 RGB before print contrast. */
  tone: Float32Array;
  /** Opacity 0..1, rim. */
  look: Float32Array;
  /** Arc smoothstep edges for the dissolve-in gate. */
  gate: Float32Array;
  /** Arc smoothstep edges past which vertices dissolve out. */
  exit: Float32Array;
  /** Mask layers that hide the whale: near, wing, puffs. */
  behind: Float32Array;
};
export type SkyFrame = {
  vertices: Float32Array;
  /** Draw order: far, calf, hero, drift. */
  whales: readonly WhaleDraw[];
  streams: Readonly<Record<StreamId, StreamFrame>>;
  /** Painted-subject rig uniforms, written by the RigSource. */
  rig: Float32Array;
  /** [live, gust]. */
  wisps: readonly WispDraw[];
};
/** Painted subjects, ticked on the pod's clock. */
export type RigSource = {
  tick(time: number, hand: Hand, gestures: readonly Gesture[]): void;
  write(out: Float32Array): void;
  calm(): void;
};
const RESTING: RigSource = {
  tick: () => undefined,
  write: (out) => out.fill(0),
  calm: () => undefined,
};

type Member = {
  whale: Swimmer | Calf;
  stream: Stream;
  attention: Attention;
  body: Body;
  wake: number;
};
/** The hand's parting body on one current, and when that current was last plucked. */
type Parting = { s: number; d: number; height: number; plucked: number };
/** What a press began on: a current it pinches, or open sky where it draws a wisp. */
type Grip =
  | { kind: "none" }
  | { kind: "band"; stream: Stream }
  | { kind: "wisp" };
const LOOSE: Grip = { kind: "none" };
const NONE: readonly Gesture[] = [];

/** Hero and calf on the undercurrent, a far whale on the high current and a drift whale on the veil, on a fixed 60 Hz clock. */
export class Pod {
  readonly streams: Readonly<Record<StreamId, Stream>>;
  readonly hero: Swimmer;
  readonly calf: Calf;
  readonly far: Swimmer;
  readonly drift: Swimmer;
  time = -PREROLL;
  /** Drift cues dropped because the drift was still visible after the hold. */
  dropped = 0;
  private ticks = -Math.round(PREROLL / STEP);
  private accumulator = 0;
  private readonly frame: SkyFrame;
  private readonly crew: Readonly<
    Record<"hero" | "calf" | "far" | "drift", Member>
  >;
  private readonly members: readonly Member[];
  /** STREAM_IDS order. */
  private readonly currents: readonly Stream[];
  private readonly parting: Readonly<Record<StreamId, Parting>>;
  private readonly wisps = new Wisps();
  private readonly cueArc: number;
  private cued: number | null = null;
  private hand: Hand = AWAY;
  /** Input not yet applied by a tick: the hand it started from, its gestures and its duration. */
  private from: Hand = AWAY;
  private queued: Gesture[] = [];
  private elapsed = 0;
  private waiting = false;
  private grip: Grip = LOOSE;
  /** A cheer the next tick spends. */
  private cheering = false;
  private readonly forwarded: Gesture[] = [];
  private readonly swipe: Swipe = { x0: 0, y0: 0, x1: 0, y1: 0, speed: 0 };
  private readonly spot = { s: 0, d: 0 };
  private readonly other = { s: 0, d: 0 };
  private readonly scratch: RouteFrame = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    nx: 0,
    ny: 0,
  };

  constructor(
    private readonly haze: Haze,
    private readonly rig: RigSource = RESTING,
  ) {
    this.streams = {
      high: new Stream("high"),
      under: new Stream("under"),
      veil: new Stream("veil"),
    };
    const { under, high, veil } = this.streams;
    this.hero = this.lead(POD.hero);
    this.far = this.lead(POD.far);
    this.drift = this.lead(POD.drift);
    this.calf = new Calf(POD.calf, this.hero, this.time, POD.calf.phase);
    this.cueArc = under.route.arcAtX(POD.drift.cue.x);
    const member = (
      whale: Swimmer | Calf,
      stream: Stream,
      limits: Limits,
      wake: number,
    ): Member => ({
      whale,
      stream,
      attention: new Attention(limits),
      body: emptyBody(),
      wake,
    });
    this.crew = {
      hero: member(this.hero, under, LIMITS.hero, POD.hero.wake),
      calf: member(this.calf, under, LIMITS.calf, POD.calf.wake),
      far: member(this.far, high, LIMITS.far, POD.far.wake),
      drift: member(this.drift, veil, LIMITS.drift, POD.drift.wake),
    };
    this.members = Object.values(this.crew);
    this.currents = [high, under, veil];
    const rest = (): Parting => ({
      s: 0,
      d: 0,
      height: 0,
      plucked: -Infinity,
    });
    this.parting = { high: rest(), under: rest(), veil: rest() };
    const draw = (index: number, stream: Stream): WhaleDraw => ({
      first: index * WHALE_VERTICES,
      tone: new Float32Array(3),
      look: Float32Array.of(1, RIM),
      gate: Float32Array.from(stream.gate ?? NO_GATE),
      exit: Float32Array.from(stream.exit ?? NO_EXIT),
      behind: Float32Array.from(stream.spec.behind),
    });
    this.frame = {
      vertices: new Float32Array(WHALE_COUNT * WHALE_VERTICES * VERTEX_FLOATS),
      whales: [draw(0, high), draw(1, under), draw(2, under), draw(3, veil)],
      streams: { high: high.frame, under: under.frame, veil: veil.frame },
      rig: new Float32Array(RIG_FLOATS),
      wisps: this.wisps.draws,
    };
    while (this.ticks < 0) this.tick(false);
  }

  /** Steady airspeed and ground speed at arc s, averaged over a stroke. */
  private steady(spec: Lead, s: number) {
    const stream = this.streams[spec.stream];
    const carried = stream.coupling(s);
    const air = spec.cruise * (1 - spec.relax * carried);
    return { air, ground: air + carried * stream.spec.flow };
  }

  /** Places a whale so that it reaches spec.startX at t = 0. */
  private lead(spec: Lead) {
    const end = this.streams[spec.stream].route.arcAtX(spec.startX);
    const { air, ground } = this.steady(spec, end);
    return new Swimmer(
      spec,
      end - ground * PREROLL,
      spec.phase,
      spec.fadeIn,
      air,
    );
  }

  /** Advances by dt. The sense is held for every tick; its gestures and swipe apply on the first one, or wait for it. */
  step(dt: number, sense: Sense = STILL) {
    const h = Math.max(0, Math.min(dt, 0.1));
    this.accumulator += h;
    if (!this.waiting) {
      this.from = sense.previous;
      this.elapsed = 0;
      this.waiting = true;
    }
    this.elapsed += h;
    for (const gesture of sense.gestures) this.queued.push(gesture);
    this.hand = sense.hand;
    while (this.accumulator + 1e-9 >= STEP) {
      this.accumulator -= STEP;
      this.tick(this.waiting);
      this.waiting = false;
      this.queued.length = 0;
    }
  }

  mood(whale: keyof typeof LIMITS): Mood["kind"] {
    return this.crew[whale].attention.mood.kind;
  }

  /**
   * Something on the page went well: every whale in view flicks its flukes
   * once, as it does for a tap on its body.
   */
  cheer() {
    this.cheering = true;
  }

  /** Pause, hidden tab or sync: drops input, moods and stirs; a live wisp drifts off as a gust. */
  calm() {
    for (const { attention } of this.members) attention.calm();
    this.rig.calm();
    this.wisps.release();
    this.hand = AWAY;
    this.from = AWAY;
    this.queued.length = 0;
    this.waiting = false;
    this.grip = LOOSE;
    this.cheering = false;
  }

  private tick(fresh: boolean) {
    this.ticks++;
    this.time = this.ticks * STEP;
    const time = this.time,
      hand = this.hand;
    const { under, high, veil } = this.streams;
    for (const { whale, stream, body } of this.members)
      locate(body, whale, stream, time, this.visible(whale, stream));

    if (this.cheering) {
      this.cheering = false;
      // Alternate sides, so the pod does not move as one.
      this.members.forEach((member, index) => {
        if (member.body.visible) this.flick(member, index % 2 ? 1 : -1);
      });
    }
    const swipe = fresh ? this.swiped(this.from, hand) : null;
    const forwarded = this.forwarded;
    forwarded.length = 0;
    for (const gesture of fresh ? this.queued : NONE) {
      if (gesture.kind === "release") this.released(gesture.x, gesture.y);
      if (gesture.kind === "release" || !this.tapped(gesture.x, gesture.y))
        forwarded.push(gesture);
    }
    this.press(hand);
    if (swipe) for (const stream of this.currents) this.cross(stream);

    const { hero, calf, far, drift } = this.crew;
    this.hero.respond(hero.attention.tick(STEP, time, hero.body, hand, swipe));
    calf.attention.follow(hero.attention, time);
    this.calf.respond(calf.attention.tick(STEP, time, calf.body, hand, swipe));
    this.far.respond(far.attention.tick(STEP, time, far.body, hand, swipe));
    this.drift.respond(
      drift.attention.tick(STEP, time, drift.body, hand, swipe),
    );

    const before = this.hero.s;
    this.wake(under, this.hero.step(STEP, under), POD.hero.wake);
    this.wake(under, this.calf.step(STEP, this.time, this.hero), POD.calf.wake);
    this.wake(high, this.far.step(STEP, high), POD.far.wake);
    this.wake(veil, this.drift.step(STEP, veil), POD.drift.wake);
    // startX places the drift's first pass, standing in for the pre-roll's cue.
    if (time > 0 && before < this.cueArc && this.hero.s >= this.cueArc)
      this.cued = time;
    if (this.calf.s - 1.1 * this.calf.length >= under.route.arcAtX(EXIT_X)) {
      this.reenter(this.hero, POD.hero);
      this.calf.respawn(this.time, this.hero);
    }
    const farX = high.route.frame(this.far.s, this.scratch).x;
    if (farX >= POD.far.dissolve[1]) this.reenter(this.far, POD.far);
    if (this.cued !== null) {
      if (this.drift.hidden) {
        this.reenter(this.drift, POD.drift);
        this.cued = null;
      } else if (time - this.cued > POD.drift.cue.hold) {
        this.dropped++;
        this.cued = null;
      }
    }

    for (const stream of this.currents) this.part(stream, hand);
    if (this.grip.kind === "wisp" && hand.kind === "press")
      this.wisps.follow(hand.x, hand.y, time);
    this.wisps.tick(STEP, time);
    this.rig.tick(time, hand, forwarded);
  }

  /** Whether moods and taps can see the whale: shown, its nose past the gate and before the exit. */
  private visible(whale: Swimmer | Calf, stream: Stream) {
    const shown = whale instanceof Swimmer ? whale.opacity >= 0.5 : true;
    return (
      shown &&
      whale.s >= (stream.gate?.[1] ?? -Infinity) &&
      whale.s <= (stream.exit?.[0] ?? Infinity)
    );
  }

  /** The hand's path since the last applied input, or null when either end is away. */
  private swiped(from: Hand, to: Hand): Swipe | null {
    if (from.kind === "away" || to.kind === "away") return null;
    const swipe = this.swipe;
    swipe.x0 = from.x;
    swipe.y0 = from.y;
    swipe.x1 = to.x;
    swipe.y1 = to.y;
    swipe.speed =
      Math.hypot(to.x - from.x, to.y - from.y) / Math.max(this.elapsed, STEP);
    return swipe;
  }

  /** One flick of a whale's flukes toward `side`, and the wake it leaves. */
  private flick(
    { body, whale, stream, attention, wake }: Member,
    side: 1 | -1,
  ) {
    attention.flick(this.time, side, body.length);
    stream.wakes.emit(
      whale.s - whale.length,
      this.time,
      side * ATTENTION.tap.wake * wake,
    );
  }

  /** Tap resolution, first hit wins: a whale body flicks, else the nearest current within reach plucks. */
  private tapped(x: number, y: number) {
    let target: Member | null = null,
      nearest = Infinity;
    for (const member of this.members) {
      const { body } = member;
      if (!body.visible) continue;
      const distance = spineDistance(body, x, y) / body.length;
      if (distance > ATTENTION.tap.reach || distance >= nearest) continue;
      target = member;
      nearest = distance;
    }
    if (target) {
      const { body } = target;
      const lateral =
        (x - valueAt(body.spine, 0)) * body.nx +
        (y - valueAt(body.spine, 1)) * body.ny;
      this.flick(target, lateral > 0 ? -1 : 1);
      return true;
    }
    let current: Stream | null = null,
      closest = Infinity,
      s = 0,
      d = 0;
    for (const stream of this.currents) {
      const at = stream.lateral(x, y, this.time, this.spot);
      if (at.s < stream.start || at.s > stream.end) continue;
      if (Math.abs(at.d) > TAP.reach || Math.abs(at.d) >= closest) continue;
      current = stream;
      closest = Math.abs(at.d);
      s = at.s;
      d = at.d;
    }
    if (!current) return false;
    this.pluck(current, s, (d >= 0 ? -1 : 1) * TAP.strength);
    return true;
  }

  /** A press that began in a band plucks it toward the hand on release. */
  private released(x: number, y: number) {
    if (this.grip.kind !== "band") return;
    const stream = this.grip.stream;
    const at = stream.lateral(x, y, this.time, this.spot);
    if (at.s < stream.start || at.s > stream.end) return;
    this.pluck(stream, at.s, (at.d >= 0 ? 1 : -1) * RELEASE);
  }

  /** Classifies a new press by where it began, and lets a wisp go when the press ends. */
  private press(hand: Hand) {
    if (hand.kind !== "press") {
      if (this.grip.kind === "wisp") this.wisps.release();
      this.grip = LOOSE;
      return;
    }
    if (this.grip.kind !== "none") return;
    const [x, y] = hand.origin;
    for (const stream of this.currents) {
      const at = stream.lateral(x, y, this.time, this.spot);
      if (!stream.holds(at.s, at.d, PARTING.margin)) continue;
      this.grip = { kind: "band", stream };
      return;
    }
    this.grip = { kind: "wisp" };
    this.wisps.begin(x, y, this.time);
  }

  /** A fast swipe across a current plucks it where it crossed. */
  private cross(stream: Stream) {
    const swipe = this.swipe;
    const a = stream.lateral(swipe.x0, swipe.y0, this.time, this.spot),
      b = stream.lateral(swipe.x1, swipe.y1, this.time, this.other);
    if (!(a.d * b.d < 0)) return;
    const s = a.s + ((b.s - a.s) * a.d) / (a.d - b.d);
    if (s < stream.start || s > stream.end) return;
    const reach = stream.halfWidth(s) + PLUCK.reach;
    if (Math.abs(a.d) >= reach || Math.abs(b.d) >= reach) return;
    const speed = (b.d - a.d) / Math.max(this.elapsed, STEP);
    if (Math.abs(speed) <= PLUCK.threshold) return;
    if (this.time < this.parting[stream.id].plucked + PLUCK.refractory) return;
    const strength = Math.max(
      0.25,
      Math.min(1, (Math.abs(speed) - PLUCK.threshold) / PLUCK.scale),
    );
    this.pluck(stream, s, Math.sign(speed) * strength);
  }

  private pluck(stream: Stream, s: number, strength: number) {
    stream.pluck(s, strength, this.time);
    this.parting[stream.id].plucked = this.time;
  }

  /** Eases the hand's parting body toward its height while the hand rests or drifts in the band. */
  private part(stream: Stream, hand: Hand) {
    const parting = this.parting[stream.id];
    let target = 0;
    if (hand.kind !== "away" && this.time >= parting.plucked + PARTING.hush) {
      const at = stream.lateral(hand.x, hand.y, this.time, this.spot);
      if (
        stream.holds(at.s, at.d, PARTING.margin) &&
        Math.hypot(hand.vx, hand.vy) < PARTING.speed
      ) {
        target = hand.kind === "press" ? PARTING.press : PARTING.hover;
        parting.s = at.s;
        parting.d = at.d;
      }
    }
    const tau = target > parting.height ? PARTING.rise : PARTING.fall;
    parting.height += (target - parting.height) * (1 - Math.exp(-STEP / tau));
    if (target === 0 && parting.height < 0.05) parting.height = 0;
  }

  private wake(stream: Stream, event: StrokeEvent | null, strength: number) {
    if (event) stream.wakes.emit(event.s, this.time, event.side * strength);
  }

  /** Starts the next pass hidden upstream, so the whale reaches its entry arc when its cue says. */
  private reenter(swimmer: Swimmer, spec: Lead) {
    const cycle = swimmer.cycle + 1;
    const lane = spec.lane + spec.jitter * (2 * hash(cycle * 2 + 1) - 1);
    const cue = spec.cue;
    if (cue.kind === "after") {
      swimmer.respawn(spec.entry, lane);
      return;
    }
    const wait = cue.base + cue.spread * hash(cycle * 2);
    const { ground } = this.steady(spec, spec.entry);
    swimmer.respawn(spec.entry - ground * wait, lane, wait);
  }

  /** Describes the current time. Returns the same frame and typed arrays every call, without allocating. */
  write(): SkyFrame {
    const { under, high, veil } = this.streams;
    this.drawWhale(0, this.far, high, POD.far.haze, this.far.opacity);
    this.drawWhale(1, this.calf, under, POD.calf.haze, 1);
    this.drawWhale(2, this.hero, under, POD.hero.haze, this.hero.opacity);
    this.drawWhale(3, this.drift, veil, POD.drift.haze, this.drift.opacity);
    this.packStream(under);
    this.packStream(high);
    this.packStream(veil);
    writeBody(under.frame.bodies, 0, this.hero, this.hero.opacity);
    writeBody(under.frame.bodies, 1, this.calf, 1);
    writeBody(high.frame.bodies, 0, this.far, this.far.opacity);
    writeBody(veil.frame.bodies, 0, this.drift, this.drift.opacity);
    this.hold(under);
    this.hold(high);
    this.hold(veil);
    this.rig.write(this.frame.rig);
    this.wisps.write(this.time);
    return this.frame;
  }

  private drawWhale(
    index: number,
    pose: WhalePose,
    stream: Stream,
    haze: number,
    opacity: number,
  ) {
    const draw = this.frame.whales[index];
    if (!draw) throw new RangeError(`Whale draw ${index} is missing`);
    const vertices = this.frame.vertices;
    writeWhale(pose, stream, this.time, vertices, draw.first);
    const middle = (draw.first + spineVertex(MIDBODY)) * VERTEX_FLOATS;
    let x = valueAt(vertices, middle),
      y = valueAt(vertices, middle + 1);
    // Behind the cumulus or the wing the midbody samples white paint; tint from the open air between.
    const from = stream.gate ? stream.gate[1] + CLEAR.gate : -Infinity,
      to = stream.exit ? stream.exit[0] - CLEAR.exit : Infinity;
    const arc = valueAt(vertices, middle + 3);
    if (arc < from || arc > to) {
      const air = stream.centerline(
        arc < from ? from : to,
        this.time,
        this.scratch,
      );
      x = air.x + air.nx * pose.lane;
      y = air.y + air.ny * pose.lane;
    }
    this.haze.tone(x, y, haze, draw.tone);
    draw.look[0] = opacity;
  }

  /** Writes the hand's parting body into its slot. */
  private hold(stream: Stream) {
    const { s, d, height } = this.parting[stream.id];
    stream.part(s, d, height);
  }

  private packStream(stream: Stream) {
    stream.clock(this.time, stream.frame.clock);
    stream.wakes.pack(this.time, stream.spec.flow, stream.frame.wakes);
    stream.plucks.pack(this.time, stream.spec.flow, stream.frame.wakes);
  }
}

/** A parting body slot: centre arc, lane, half length, half height. Unused slots stay (0, 0, 1, 0). */
function writeBody(
  bodies: Float32Array,
  slot: number,
  pose: WhalePose,
  opacity: number,
) {
  const L = pose.length;
  bodies[slot * 4] = pose.s - 0.42 * L;
  bodies[slot * 4 + 1] = pose.lane;
  bodies[slot * 4 + 2] = 0.52 * L;
  bodies[slot * 4 + 3] = (0.13 * L + 3) * opacity;
}
