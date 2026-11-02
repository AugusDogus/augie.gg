import { type Haze, RIM } from "./art-maps";
import { type RouteFrame, valueAt } from "./route";
import { Stream, type StreamFrame, type StreamId } from "./streams";
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
  WHALE_COUNT = 3;
/** Respawn the mother once the calf's rearmost arc is past this x. */
const EXIT_X = 1184;
/** Spine node whose position picks the whale's air colour. */
const MIDBODY = 14;
const NO_GATE = Float32Array.of(-1e4, -1e4 + 1);

type Lead = SwimmerSpec & {
  /** Aerial haze, 0 near to 1 far. */
  haze: number;
  /** Arc where the whale re-enters. */
  entry: number;
  /** Hidden wait before re-entry: base + spread × hash(cycle), s. */
  wait: readonly [base: number, spread: number];
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
    wait: [0.2, 0.4],
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
    wait: [1, 1],
    fadeIn: 2,
    dissolve: [700, 790],
  },
} as const satisfies {
  hero: Lead;
  calf: CalfSpec & { haze: number };
  far: Lead;
};

export type WhaleDraw = {
  /** First vertex index (not float offset) of this whale in SkyFrame.vertices. */
  first: number;
  /** Linear 0..1 RGB before print contrast. */
  tone: Float32Array;
  /** Opacity 0..1, rim. */
  look: Float32Array;
  /** Arc smoothstep edges for the dissolve gate. */
  gate: Float32Array;
};
export type SkyFrame = {
  vertices: Float32Array;
  /** Draw order: far, calf, hero. */
  whales: readonly WhaleDraw[];
  streams: Readonly<Record<StreamId, StreamFrame>>;
};

/** Deterministic 0..1 hash of an integer. */
function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Hero and calf on the undercurrent and a far whale on the high current, on a fixed 60 Hz clock. */
export class Pod {
  readonly streams: Readonly<Record<StreamId, Stream>>;
  readonly hero: Swimmer;
  readonly calf: Calf;
  readonly far: Swimmer;
  time = -PREROLL;
  private ticks = -Math.round(PREROLL / STEP);
  private accumulator = 0;
  private readonly frame: SkyFrame;
  private readonly scratch: RouteFrame = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    nx: 0,
    ny: 0,
  };

  constructor(private readonly haze: Haze) {
    this.streams = {
      high: new Stream("high"),
      under: new Stream("under"),
    };
    this.hero = this.lead(POD.hero);
    this.far = this.lead(POD.far);
    this.calf = new Calf(POD.calf, this.hero, this.time, POD.calf.phase);
    const draw = (index: number, gate: Float32Array): WhaleDraw => ({
      first: index * WHALE_VERTICES,
      tone: new Float32Array(3),
      look: Float32Array.of(1, RIM),
      gate,
    });
    const gate = this.streams.under.gate;
    const underGate = gate ? Float32Array.of(gate[0], gate[1]) : NO_GATE;
    this.frame = {
      vertices: new Float32Array(WHALE_COUNT * WHALE_VERTICES * VERTEX_FLOATS),
      whales: [draw(0, NO_GATE), draw(1, underGate), draw(2, underGate)],
      streams: {
        high: this.streams.high.frame,
        under: this.streams.under.frame,
      },
    };
    while (this.ticks < 0) this.tick();
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

  step(dt: number) {
    this.accumulator += Math.max(0, Math.min(dt, 0.1));
    while (this.accumulator + 1e-9 >= STEP) {
      this.accumulator -= STEP;
      this.tick();
    }
  }

  private tick() {
    this.ticks++;
    this.time = this.ticks * STEP;
    const { under, high } = this.streams;
    this.wake(under, this.hero.step(STEP, under), POD.hero.wake);
    this.wake(under, this.calf.step(STEP, this.time, this.hero), POD.calf.wake);
    this.wake(high, this.far.step(STEP, high), POD.far.wake);
    if (this.calf.s - 1.1 * this.calf.length >= under.route.arcAtX(EXIT_X)) {
      this.reenter(this.hero, POD.hero);
      this.calf.respawn(this.time, this.hero);
    }
    const farX = high.route.frame(this.far.s, this.scratch).x;
    if (farX >= POD.far.dissolve[1]) this.reenter(this.far, POD.far);
  }

  private wake(stream: Stream, event: StrokeEvent | null, strength: number) {
    if (event) stream.wakes.emit(event.s, this.time, event.side * strength);
  }

  /** Starts the next pass hidden upstream, so the whale reaches its entry arc after the wait. */
  private reenter(swimmer: Swimmer, spec: Lead) {
    const cycle = swimmer.cycle + 1;
    const wait = spec.wait[0] + spec.wait[1] * hash(cycle * 2);
    const lane = spec.lane + spec.jitter * (2 * hash(cycle * 2 + 1) - 1);
    const { ground } = this.steady(spec, spec.entry);
    swimmer.respawn(spec.entry - ground * wait, lane, wait);
  }

  /** Describes the current time. Returns the same frame and typed arrays every call, without allocating. */
  write(): SkyFrame {
    const { under, high } = this.streams;
    this.drawWhale(0, this.far, high, POD.far.haze, this.far.opacity);
    this.drawWhale(1, this.calf, under, POD.calf.haze, 1);
    this.drawWhale(2, this.hero, under, POD.hero.haze, this.hero.opacity);
    this.packStream(under);
    this.packStream(high);
    writeBody(under.frame.bodies, 0, this.hero, this.hero.opacity);
    writeBody(under.frame.bodies, 1, this.calf, 1);
    writeBody(high.frame.bodies, 0, this.far, this.far.opacity);
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
    // Behind the cumulus the midbody samples white cloud; tint from the open air past the gate.
    const clear = stream.gate ? stream.gate[1] + 100 : -Infinity;
    if (valueAt(vertices, middle + 3) < clear) {
      const air = stream.centerline(clear, this.time, this.scratch);
      x = air.x + air.nx * pose.lane;
      y = air.y + air.ny * pose.lane;
    }
    this.haze.tone(x, y, haze, draw.tone);
    draw.look[0] = opacity;
  }

  private packStream(stream: Stream) {
    stream.clock(this.time, stream.frame.clock);
    stream.wakes.pack(this.time, stream.spec.flow, stream.frame.wakes);
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
