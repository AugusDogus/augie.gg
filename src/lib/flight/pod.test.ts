import { describe, expect, test } from "bun:test";
import { Haze } from "./art-maps";
import { AWAY, type Gesture, type Hand, type Sense } from "./instrument";
import {
  LIMITS,
  POD,
  PREROLL,
  Pod,
  type RigSource,
  STEP,
  WHALE_COUNT,
  type SkyFrame,
} from "./pod";
import { type RouteFrame, valueAt } from "./route";
import {
  BODY_SLOTS,
  MEANDER,
  PARTING,
  PLUCK,
  type Stream,
  type StreamFrame,
  WAKE,
  WAKE_SLOTS,
  WHALE_WAKES,
  smoothstep,
} from "./streams";
import { WISP } from "./trail";
import { VERTEX_FLOATS, WHALE_VERTICES, spineVertex } from "./whale-body";

const FAR = 0,
  CALF = 1,
  HERO = 2,
  DRIFT = 3;
const NOSE = 1;
const TAU = Math.PI * 2;
const haze = Haze.flat(0.5, 0.5, 0.5);
const slot = (bodies: Float32Array, k: number) =>
  Array.from({ length: 4 }, (_, i) => valueAt(bodies, k * 4 + i));

/** The band edge at arc s on `side` (1 ventral, -1 dorsal), parted around the live bodies the way the bead shader parts back beads. */
/** CPU stand-in for the bead shader's outer band edge, including live pluck kinks. */
function partedEdge(
  stream: Stream,
  frame: StreamFrame,
  s: number,
  time: number,
  out: RouteFrame,
  side: 1 | -1 = 1,
) {
  const { bodies, wakes } = frame;
  let kink = 0;
  for (let k = WHALE_WAKES; k < WAKE_SLOTS; k++) {
    const d = s - valueAt(wakes, k * 4);
    kink +=
      valueAt(wakes, k * 4 + 1) *
      smoothstep(0, 0.6, valueAt(wakes, k * 4 + 2)) *
      Math.exp((-d * d) / 968);
  }
  let across =
    side * (stream.halfWidth(s) + MEANDER.amplitude + WAKE.lateral) +
    PLUCK.kink * Math.max(-1, Math.min(1, kink));
  for (let k = 0; k < BODY_SLOTS; k++) {
    const body = k * 4;
    const u = (s - valueAt(bodies, body)) / valueAt(bodies, body + 2),
      h = valueAt(bodies, body + 3) * Math.sqrt(Math.max(0, 1 - u * u)),
      d = across - valueAt(bodies, body + 1);
    across +=
      Math.sign(d + 1e-4) * 0.5 * (Math.sqrt(d * d + 4 * h * h) - Math.abs(d));
  }
  stream.centerline(s, time, out);
  out.x += out.nx * across;
  out.y += out.ny * across;
  return out;
}
const vertex = (frame: SkyFrame, whale: number, index: number) => {
  const offset = (whale * WHALE_VERTICES + index) * VERTEX_FLOATS;
  return {
    x: valueAt(frame.vertices, offset),
    y: valueAt(frame.vertices, offset + 1),
    arc: valueAt(frame.vertices, offset + 3),
  };
};
const opacity = (frame: SkyFrame, whale: number) =>
  valueAt(frame.whales[whale]?.look ?? [], 0);

describe("pod at t=0", () => {
  test("whales start where the composition places them", () => {
    const pod = new Pod(haze);
    expect(pod.time).toBe(0);
    const frame = pod.write();
    const hero = vertex(frame, HERO, NOSE),
      calf = vertex(frame, CALF, NOSE),
      far = vertex(frame, FAR, NOSE);
    expect(hero.x).toBeGreaterThanOrEqual(915);
    expect(hero.x).toBeLessThanOrEqual(945);
    expect(hero.y).toBeGreaterThanOrEqual(728);
    expect(hero.y).toBeLessThanOrEqual(758);
    expect(calf.x).toBeGreaterThanOrEqual(695);
    expect(calf.x).toBeLessThanOrEqual(735);
    expect(far.x).toBeGreaterThanOrEqual(585);
    expect(far.x).toBeLessThanOrEqual(615);
    for (const whale of [FAR, CALF, HERO])
      expect(opacity(frame, whale)).toBe(1);
  });

  test("the pre-roll leaves stroke wakes trailing in the undercurrent", () => {
    const wakes = new Pod(haze).write().streams.under.wakes;
    const live = Array.from({ length: 8 }, (_, k) => valueAt(wakes, k * 4 + 1));
    expect(
      live.filter((amplitude) => amplitude !== 0).length,
    ).toBeGreaterThanOrEqual(1);
  });

  test("draws are ordered far, calf, hero, drift with each current's gate, exit and layers", () => {
    const frame = new Pod(haze).write();
    expect(frame.whales.map((whale) => whale.first)).toEqual([
      0, 106, 212, 318,
    ]);
    expect(frame.vertices).toHaveLength(
      WHALE_COUNT * WHALE_VERTICES * VERTEX_FLOATS,
    );
    const arrays = (key: "gate" | "exit" | "behind") =>
      frame.whales.map((whale) => [...whale[key]]);
    expect(arrays("gate")).toEqual([
      [-1e4, -1e4 + 1],
      [315, 355],
      [315, 355],
      [153, 205],
    ]);
    const none = [1e4, 1e4 + 1];
    expect(arrays("exit")).toEqual([none, none, none, [676, 716]]);
    expect(arrays("behind")).toEqual([
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [0, 1, 1],
    ]);
  });

  test("the drift waits behind its entry gate, so the poster has no drift", () => {
    const frame = new Pod(haze).write();
    for (let k = 0; k < WHALE_VERTICES; k++)
      expect(vertex(frame, DRIFT, k).arc).toBeLessThan(153);
  });

  test("without a rig source the rig uniforms are zero and no wisp draws", () => {
    const frame = new Pod(haze).write();
    expect([...frame.rig]).toEqual(new Array(12).fill(0));
    expect(frame.wisps.map((wisp) => wisp.visible)).toEqual([false, false]);
  });

  test("parting bodies follow each whale and close while it is hidden", () => {
    const pod = new Pod(haze);
    const expectBody = (
      actual: number[],
      whale: { s: number; lane: number; length: number },
      shown: number,
    ) => {
      const L = whale.length;
      [
        whale.s - 0.42 * L,
        whale.lane,
        0.52 * L,
        (0.13 * L + 3) * shown,
      ].forEach((value, i) => expect(valueAt(actual, i)).toBeCloseTo(value, 3));
    };
    const check = () => {
      const { under, high, veil } = pod.write().streams;
      expectBody(slot(under.bodies, 0), pod.hero, pod.hero.opacity);
      expectBody(slot(under.bodies, 1), pod.calf, 1);
      expectBody(slot(high.bodies, 0), pod.far, pod.far.opacity);
      expectBody(slot(veil.bodies, 0), pod.drift, pod.drift.opacity);
      for (const empty of [
        slot(under.bodies, 2),
        slot(high.bodies, 1),
        slot(high.bodies, 2),
        slot(veil.bodies, 1),
        slot(veil.bodies, 2),
      ])
        expect(empty).toEqual([0, 0, 1, 0]);
      return valueAt(high.bodies, 3);
    };
    expect(check()).toBeGreaterThan(10);
    while (pod.far.opacity > 0) pod.step(STEP);
    expect(check()).toBe(0);
  });
});

describe("pod clock", () => {
  test("the same second gives the same frame at 30, 60 and 144 updates per second", () => {
    // A constant hover ahead of the hero, inside the undercurrent: it parts the band and makes the hero curious.
    const hand: Hand = { kind: "hover", x: 1010, y: 742, vx: 0, vy: 0 };
    for (const sense of [undefined, { hand, previous: hand, gestures: [] }]) {
      const run = (rate: number) => {
        const pod = new Pod(haze);
        for (let i = 0; i < rate; i++) pod.step(1 / rate, sense);
        const frame = pod.write();
        return {
          time: pod.time,
          vertices: [...frame.vertices],
          whales: frame.whales.map((whale) => [...whale.tone, ...whale.look]),
          streams: Object.values(frame.streams).map((stream) => [
            ...stream.clock,
            ...stream.bodies,
            ...stream.wakes,
          ]),
          mood: pod.mood("hero"),
        };
      };
      const sixty = run(60);
      expect(sixty.time).toBeCloseTo(1, 9);
      if (sense) {
        expect(sixty.mood).toBe("curious");
        expect(valueAt(sixty.streams[1] ?? [], 2 * 4 + 3)).toBeGreaterThan(5);
      }
      expect(run(30)).toEqual(sixty);
      expect(run(144)).toEqual(sixty);
    }
  });

  test("write() reuses one frame and every array, including the rig and wisps", () => {
    const arrays = (frame: SkyFrame) => [
      frame.vertices,
      frame.rig,
      ...frame.whales.flatMap((whale) => [
        whale.tone,
        whale.look,
        whale.gate,
        whale.exit,
        whale.behind,
      ]),
      ...Object.values(frame.streams).flatMap((stream) => [
        stream.clock,
        stream.bodies,
        stream.wakes,
      ]),
      ...frame.wisps.flatMap((wisp) => [
        wisp.route,
        wisp.range,
        wisp.shape,
        wisp.look,
        wisp.clock,
        wisp.behind,
      ]),
    ];
    const pod = new Pod(haze);
    const first = pod.write();
    const before = arrays(first);
    const vertices = [...first.vertices];
    pod.step(0.5);
    const second = pod.write();
    expect(second).toBe(first);
    const after = arrays(second);
    expect(after).toHaveLength(before.length);
    after.forEach((array, i) => expect(Object.is(array, before[i])).toBe(true));
    expect([...second.vertices]).not.toEqual(vertices);
  });

  test("large frame gaps are clamped", () => {
    const pod = new Pod(haze);
    pod.step(5);
    expect(pod.time).toBeCloseTo(0.1, 9);
    pod.step(-1);
    expect(pod.time).toBeCloseTo(0.1, 9);
  });
});

describe("pod without input", () => {
  /** FNV-1a over the float32 bit patterns of values[from, to). */
  const digest = (
    hash: number,
    values: Float32Array,
    from = 0,
    to = values.length,
  ) => {
    const bits = new Uint32Array(values.buffer, values.byteOffset, to);
    for (let i = from; i < to; i++)
      hash = Math.imul(hash ^ valueAt(bits, i), 0x01000193);
    return hash;
  };
  const width = 600,
    height = 437;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      data.set(
        [(x * 255) / width, (y * 255) / height, 128, 255],
        (y * width + x) * 4,
      );
  const gradient = Haze.fromSample({ data, width, height });

  test("ten minutes of far, calf, hero and the under and high frames match the golden digest", () => {
    const pod = new Pod(gradient);
    let hash = 0x811c9dc5;
    const record = () => {
      const frame = pod.write();
      hash = digest(
        hash,
        frame.vertices,
        0,
        3 * WHALE_VERTICES * VERTEX_FLOATS,
      );
      for (const whale of frame.whales.slice(0, 3))
        for (const array of [whale.tone, whale.look, whale.gate])
          hash = digest(hash, array);
      for (const id of ["under", "high"] as const) {
        const stream = frame.streams[id];
        hash = digest(hash, stream.clock);
        hash = digest(hash, stream.bodies);
        hash = digest(hash, stream.wakes, 0, 8 * 4);
      }
    };
    record();
    for (let i = 0; i < 60 * 600; i++) {
      pod.step(STEP);
      record();
    }
    expect((hash >>> 0).toString(16).padStart(8, "0")).toBe("53fd05e6");
  });

  test("the drift takes its tint from open air between its gate and exit", () => {
    const pod = new Pod(gradient);
    const veil = pod.streams.veil;
    const [, inside = 0] = veil.gate ?? [];
    const [leave = 0] = veil.exit ?? [];
    const middle = (DRIFT * WHALE_VERTICES + spineVertex(14)) * VERTEX_FLOATS;
    const expected = new Float32Array(3);
    const tint = (arc: number) => {
      const air = veil.centerline(arc, pod.time, {
        x: 0,
        y: 0,
        tx: 0,
        ty: 0,
        nx: 0,
        ny: 0,
      });
      return [
        ...gradient.tone(
          air.x + air.nx * pod.drift.lane,
          air.y + air.ny * pod.drift.lane,
          POD.drift.haze,
          expected,
        ),
      ];
    };
    const seen = { early: false, open: false, late: false };
    for (let i = 0; i < 60 * 40; i++) {
      pod.step(STEP);
      const frame = pod.write();
      const arc = valueAt(frame.vertices, middle + 3);
      const tone = [...(frame.whales[DRIFT]?.tone ?? [])];
      if (arc < inside + 100) {
        seen.early = true;
        expect(tone).toEqual(tint(inside + 100));
      } else if (arc > leave - 80) {
        seen.late = true;
        expect(tone).toEqual(tint(leave - 80));
      } else seen.open = true;
    }
    expect(seen).toEqual({ early: true, open: true, late: true });
  });
});

describe("ten minutes of pod", () => {
  const pod = new Pod(haze);
  const exit = pod.streams.under.route.arcAtX(1184);
  const gateEnd = POD.hero.entry + 50;
  const stats = {
    heroLow: -Infinity,
    calfLow: -Infinity,
    farRight: -Infinity,
    farLowAtSpires: -Infinity,
    lag: [Infinity, -Infinity],
    draftGap: Infinity,
    heroReturns: [] as number[],
    farReturns: [] as number[],
    heroRespawns: 0,
    farRespawns: 0,
    hiddenRespawns: true,
    forward: true,
    noseStep: 0,
    rateAbove: true,
    effortOrdered: true,
    bandLow: -Infinity,
    strokes: { hero: 0, calf: 0, far: 0 },
    wakeStrengths: true,
  };
  const under = pod.streams.under;
  const band = [under.route.arcAtX(860), under.route.arcAtX(1150)] as const;
  const edge: RouteFrame = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
  type Stroker = {
    name: keyof typeof stats.strokes;
    flukes: number;
    strength: number;
  };
  /** Wakes emitted this tick must sit at some whale's flukes with that whale's strength. */
  const emitted = (
    stream: Stream,
    previous: Float32Array,
    whales: readonly Stroker[],
  ) => {
    const wakes = stream.frame.wakes;
    for (let k = 0; k < WAKE_SLOTS; k++) {
      const arc = valueAt(wakes, k * 4),
        amplitude = valueAt(wakes, k * 4 + 1);
      if (amplitude === 0) continue;
      // A record from an earlier tick has only ridden the flow since.
      const carried = valueAt(previous, k * 4) + stream.spec.flow * STEP;
      if (valueAt(previous, k * 4 + 1) !== 0 && Math.abs(arc - carried) < 1e-3)
        continue;
      const whale = whales.find(({ flukes }) => Math.abs(arc - flukes) < 1e-3);
      if (whale) stats.strokes[whale.name]++;
      stats.wakeStrengths &&=
        whale !== undefined &&
        Math.abs(Math.abs(amplitude) - whale.strength) < 1e-6;
    }
  };
  let frame = pod.write();
  let calfOut: number | null = null,
    farGone: number | null = null;
  for (let i = 0; i < 60 * 600; i++) {
    const before = {
      hero: { s: pod.hero.s, cycle: pod.hero.cycle },
      far: { s: pod.far.s, cycle: pod.far.cycle },
      calf: pod.calf.s,
      calfRear: pod.calf.s - 1.1 * pod.calf.length,
      heroXs: Array.from(
        { length: WHALE_VERTICES },
        (_, k) => vertex(frame, HERO, k).x,
      ),
      noses: [FAR, CALF, HERO].map((whale) => vertex(frame, whale, NOSE)),
      wakes: {
        under: frame.streams.under.wakes.slice(),
        high: frame.streams.high.wakes.slice(),
      },
      farOpacity: opacity(frame, FAR),
    };
    pod.step(STEP);
    frame = pod.write();
    const heroRespawned = pod.hero.cycle !== before.hero.cycle,
      farRespawned = pod.far.cycle !== before.far.cycle;
    if (heroRespawned) {
      stats.heroRespawns++;
      calfOut = pod.time;
      stats.hiddenRespawns &&=
        before.calfRear >= exit - 1 &&
        before.heroXs.every((x) => x > 1164) &&
        Array.from(
          { length: WHALE_VERTICES },
          (_, k) => vertex(frame, HERO, k).arc,
        ).every((arc) => arc < 315);
    } else
      stats.forward &&= pod.hero.s > before.hero.s && pod.calf.s > before.calf;
    if (farRespawned) {
      stats.farRespawns++;
      stats.hiddenRespawns &&=
        opacity(frame, FAR) === 0 && before.farOpacity < 0.01;
    } else stats.forward &&= pod.far.s > before.far.s;
    [FAR, CALF, HERO].forEach((whale, k) => {
      const previous = before.noses[k];
      if (!previous || (whale === FAR ? farRespawned : heroRespawned)) return;
      const nose = vertex(frame, whale, NOSE);
      stats.noseStep = Math.max(
        stats.noseStep,
        Math.hypot(nose.x - previous.x, nose.y - previous.y),
      );
    });
    // A respawn moves the whale after its stroke, so that tick's wake is not checked.
    if (!heroRespawned)
      emitted(under, before.wakes.under, [
        {
          name: "hero",
          flukes: pod.hero.s - pod.hero.length,
          strength: POD.hero.wake,
        },
        {
          name: "calf",
          flukes: pod.calf.s - pod.calf.length,
          strength: POD.calf.wake,
        },
      ]);
    if (!farRespawned)
      emitted(pod.streams.high, before.wakes.high, [
        {
          name: "far",
          flukes: pod.far.s - pod.far.length,
          strength: POD.far.wake,
        },
      ]);
    // Every 4th tick (the hero moves about 2 px) keeps the scan cheap.
    if (i % 4 === 0)
      for (let s = band[0]; s <= band[1]; s++) {
        partedEdge(under, frame.streams.under, s, pod.time, edge);
        if (edge.x >= 900 && edge.x <= 1110)
          stats.bandLow = Math.max(stats.bandLow, edge.y);
      }
    if (calfOut !== null && pod.hero.s >= gateEnd) {
      stats.heroReturns.push(pod.time - calfOut);
      calfOut = null;
    }
    if (farGone === null && before.farOpacity > 0 && opacity(frame, FAR) === 0)
      farGone = pod.time;
    if (farGone !== null && opacity(frame, FAR) > 0.5) {
      stats.farReturns.push(pod.time - farGone);
      farGone = null;
    }
    for (let k = 0; k < WHALE_VERTICES; k++) {
      const hero = vertex(frame, HERO, k),
        calf = vertex(frame, CALF, k),
        far = vertex(frame, FAR, k);
      if (hero.x >= 900 && hero.x <= 1110)
        stats.heroLow = Math.max(stats.heroLow, hero.y);
      if (calf.x >= 900 && calf.x <= 1110)
        stats.calfLow = Math.max(stats.calfLow, calf.y);
      if (opacity(frame, FAR) > 0) {
        stats.farRight = Math.max(stats.farRight, far.x);
        if (far.x >= 715 && far.x <= 805)
          stats.farLowAtSpires = Math.max(stats.farLowAtSpires, far.y);
      }
    }
    const lag = pod.calf.lag;
    stats.lag = [
      Math.min(valueAt(stats.lag, 0), lag),
      Math.max(valueAt(stats.lag, 1), lag),
    ];
    stats.draftGap = Math.min(
      stats.draftGap,
      pod.hero.s - 1.06 * 170 - pod.calf.s,
    );
    stats.rateAbove &&= pod.calf.rate > pod.hero.rate;
    const ratio = pod.calf.rate / pod.hero.rate / (170 / 96);
    const behind = lag - pod.calf.slot(pod.time);
    if (Math.abs(behind) > 1e-6)
      stats.effortOrdered &&= behind > 0 ? ratio > 1 : ratio < 1;
  }

  test("hero and calf stay above the caption", () => {
    expect(stats.heroLow).toBeLessThanOrEqual(798);
    expect(stats.calfLow).toBeLessThanOrEqual(798);
  });

  test("the undercurrent stays above the caption where it parts around the whales", () => {
    expect(stats.bandLow).toBeLessThanOrEqual(800);
  });

  test("each stroke drops a wake at the flukes with its whale's strength", () => {
    expect(stats.wakeStrengths).toBe(true);
    for (const count of Object.values(stats.strokes))
      expect(count).toBeGreaterThanOrEqual(50);
  });

  test("the far whale dissolves before the nav and stays above the ship spires", () => {
    expect(stats.farRight).toBeLessThanOrEqual(800);
    expect(stats.farLowAtSpires).toBeLessThanOrEqual(128);
  });

  test("the calf drafts in line behind its mother without touching her flukes", () => {
    expect(valueAt(stats.lag, 0)).toBeGreaterThanOrEqual(190);
    expect(valueAt(stats.lag, 1)).toBeLessThanOrEqual(235);
    expect(stats.draftGap).toBeGreaterThanOrEqual(8);
  });

  test("the calf strokes faster than its mother, and harder when it drops back", () => {
    expect(stats.rateAbove).toBe(true);
    expect(stats.effortOrdered).toBe(true);
  });

  test("whales only move forward without jumps, and respawn only while hidden", () => {
    expect(stats.forward).toBe(true);
    expect(stats.noseStep).toBeLessThan(1);
    expect(stats.hiddenRespawns).toBe(true);
    expect(stats.heroRespawns).toBeGreaterThanOrEqual(10);
    expect(stats.farRespawns).toBeGreaterThanOrEqual(10);
  });

  test("whales return soon after leaving", () => {
    expect(stats.heroReturns.length).toBeGreaterThanOrEqual(10);
    for (const gap of stats.heroReturns) {
      expect(gap).toBeGreaterThanOrEqual(2.5);
      expect(gap).toBeLessThanOrEqual(4.5);
    }
    expect(stats.farReturns.length).toBeGreaterThanOrEqual(10);
    for (const gap of stats.farReturns) {
      expect(gap).toBeGreaterThanOrEqual(2);
      expect(gap).toBeLessThanOrEqual(3.5);
    }
  });

  test("the clock keeps pace with elapsed time", () => {
    expect(pod.time).toBeCloseTo(600, 6);
    expect(PREROLL).toBe(4);
  });
});

/** Fraction of a whale's vertices inside x0..x1 with arcs inside lo..hi. */
const share = (
  frame: SkyFrame,
  whale: number,
  [x0, x1]: readonly [number, number],
  [lo, hi]: readonly [number, number],
) => {
  let inside = 0;
  for (let k = 0; k < WHALE_VERTICES; k++) {
    const { x, arc } = vertex(frame, whale, k);
    if (x >= x0 && x <= x1 && arc >= lo && arc <= hi) inside++;
  }
  return inside / WHALE_VERTICES;
};
/** The whale shader's per-vertex alpha before the mask. */
const shown = (frame: SkyFrame, whale: number, k: number) => {
  const draw = frame.whales[whale];
  if (!draw) throw new RangeError(`Missing whale draw ${whale}`);
  const { arc } = vertex(frame, whale, k);
  return (
    valueAt(draw.look, 0) *
    smoothstep(valueAt(draw.gate, 0), valueAt(draw.gate, 1), arc) *
    (1 - smoothstep(valueAt(draw.exit, 0), valueAt(draw.exit, 1), arc))
  );
};

describe("ten minutes of the drift whale", () => {
  const pod = new Pod(haze);
  const veil = pod.streams.veil;
  const edge: RouteFrame = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
  const stats = {
    uncovered: 0,
    respawns: 0,
    visibleRespawns: 0,
    pastExit: 0,
    right: -Infinity,
    veilTop: Infinity,
    veilLow: -Infinity,
  };
  let frame = pod.write();
  for (let i = 0; i < 60 * 600; i++) {
    const cycle = pod.drift.cycle,
      before = opacity(frame, DRIFT);
    pod.step(STEP);
    frame = pod.write();
    if (pod.drift.cycle !== cycle) {
      stats.respawns++;
      if (before > 0) stats.visibleRespawns++;
    }
    const passing =
      share(frame, HERO, [560, 1164], [355, Infinity]) >= 0.5 ||
      share(frame, CALF, [560, 1164], [355, Infinity]) >= 0.5;
    const drifting =
      opacity(frame, DRIFT) >= 0.5 &&
      share(frame, DRIFT, [480, 840], [205, 676]) >= 0.5;
    if (!passing && !drifting) stats.uncovered++;
    for (let k = 0; k < WHALE_VERTICES; k++) {
      if (shown(frame, DRIFT, k) <= 0) continue;
      stats.right = Math.max(stats.right, vertex(frame, DRIFT, k).x);
      if (vertex(frame, DRIFT, k).arc >= 716) stats.pastExit++;
    }
    // Only the drift parts the veil without a hand; elsewhere the bare band is streams.test's bound.
    const bodies = frame.streams.veil.bodies,
      centre = valueAt(bodies, 0),
      reach = valueAt(bodies, 2);
    const from = Math.max(veil.start, Math.floor(centre - reach)),
      to = Math.min(veil.end, centre + reach);
    if (i % 2 === 0)
      for (let s = from; s <= to; s++)
        for (const side of [1, -1] as const) {
          partedEdge(veil, frame.streams.veil, s, pod.time, edge, side);
          stats.veilLow = Math.max(stats.veilLow, edge.y);
          if (edge.x >= 650 && edge.x <= 800)
            stats.veilTop = Math.min(stats.veilTop, edge.y);
        }
  }

  test("at every tick the hero or calf, or the drift, is in open sky", () => {
    expect(stats.uncovered).toBe(0);
  });

  test("every cue is taken and the drift respawns only while hidden", () => {
    expect(pod.dropped).toBe(0);
    expect(stats.respawns).toBeGreaterThanOrEqual(18);
    expect(stats.visibleRespawns).toBe(0);
  });

  test("no visible drift vertex lies past the exit or beyond the wing", () => {
    expect(stats.pastExit).toBe(0);
    expect(stats.right).toBeLessThanOrEqual(900);
  });

  test("the veil clears the ship's fringe and stays above y 600 where the drift parts it", () => {
    expect(stats.veilTop).toBeGreaterThanOrEqual(530);
    expect(stats.veilLow).toBeLessThanOrEqual(600);
  });
});

/** Records what the pod hands its rig source. */
class Rig implements RigSource {
  readonly ticks: { time: number; hand: Hand; gestures: Gesture[] }[] = [];
  calmed = 0;
  tick(time: number, hand: Hand, gestures: readonly Gesture[]) {
    this.ticks.push({ time, hand, gestures: [...gestures] });
  }
  write(out: Float32Array) {
    out.fill(0.5);
  }
  calm() {
    this.calmed++;
  }
  get taps() {
    return this.ticks.flatMap((tick) =>
      tick.gestures.filter((gesture) => gesture.kind === "tap"),
    );
  }
}
const at = (stream: Stream, s: number, lane: number, time: number) => {
  const frame = stream.centerline(s, time, {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    nx: 0,
    ny: 0,
  });
  return { x: frame.x + frame.nx * lane, y: frame.y + frame.ny * lane };
};
const hover = (point: { x: number; y: number }, vx = 0, vy = 0): Hand => ({
  kind: "hover",
  ...point,
  vx,
  vy,
});
const press = (point: { x: number; y: number }, origin = point): Hand => ({
  kind: "press",
  ...point,
  vx: 0,
  vy: 0,
  since: 0,
  origin: [origin.x, origin.y],
});
const sense = (
  hand: Hand,
  previous: Hand = hand,
  gestures: readonly Gesture[] = [],
): Sense => ({ hand, previous, gestures });
const pluckSlots = (frame: SkyFrame, id: "under" | "high" | "veil") =>
  Array.from({ length: 6 }, (_, k) =>
    valueAt(frame.streams[id].wakes, (8 + k) * 4 + 1),
  );

describe("pod with a visitor", () => {
  test("a fast swipe across a current plucks it once where it crossed", () => {
    const pod = new Pod(haze);
    const under = pod.streams.under;
    const s = under.route.arcAtX(1040);
    const above = hover(at(under, s, -45, 0)),
      below = hover(at(under, s, 45, 0));
    pod.step(STEP, sense(below, above));
    const plucks = pluckSlots(pod.write(), "under");
    expect(plucks[0]).toBeCloseTo(0.7, 5);
    expect(plucks[1]).toBeCloseTo(0.7, 5);
    expect(plucks.slice(2)).toEqual([0, 0, 0, 0]);
    const wakes = pod.write().streams.under.wakes;
    expect(Math.abs(valueAt(wakes, 8 * 4) - s)).toBeLessThan(3);
    pod.step(STEP, sense(above, below));
    expect(pluckSlots(pod.write(), "under").slice(2)).toEqual([0, 0, 0, 0]);
    for (let i = 0; i < 20; i++) pod.step(STEP, sense(above));
    pod.step(STEP, sense(below, above));
    expect(valueAt(pluckSlots(pod.write(), "under"), 2)).toBeCloseTo(0.7, 5);
  });

  test("one swipe through hero and calf startles the calf once", () => {
    const pod = new Pod(haze);
    for (let i = 0; i < 180; i++) pod.step(STEP);
    const under = pod.streams.under,
      time = pod.time + STEP;
    // Midway between the hero's flukes and the calf's nose, where the next tick locates them.
    const flukes = at(under, pod.hero.s - pod.hero.length, pod.hero.lane, time),
      nose = at(under, pod.calf.s, pod.calf.lane, time);
    const x = (flukes.x + nose.x) / 2,
      y = (flukes.y + nose.y) / 2;
    pod.step(STEP, sense(hover({ x, y: y + 30 }), hover({ x, y: y - 30 })));
    expect(pod.mood("hero")).toBe("startled");
    expect(pod.mood("calf")).toBe("startled");
    const struck = pod.time;
    while (pod.mood("calf") === "startled") pod.step(STEP);
    // A second startle 0.2 s later, when the calf follows its mother, would hold it 3.2 s.
    expect(pod.time - struck).toBeCloseTo(3, 1);
  });

  test("a slow crossing parts the current instead of plucking it", () => {
    const pod = new Pod(haze);
    const veil = pod.streams.veil;
    const s = 420;
    pod.step(STEP, sense(hover(at(veil, s, 1, 0)), hover(at(veil, s, -1, 0))));
    for (let i = 0; i < 60; i++)
      pod.step(STEP, sense(hover(at(veil, s, 1, 0))));
    const frame = pod.write();
    expect(pluckSlots(frame, "veil")).toEqual([0, 0, 0, 0, 0, 0]);
    const body = slot(frame.streams.veil.bodies, 1);
    expect(Math.abs(valueAt(body, 0) - s)).toBeLessThan(3);
    expect(valueAt(body, 2)).toBe(34);
    expect(valueAt(body, 3)).toBeGreaterThan(PARTING.hover - 0.2);
    expect(valueAt(body, 3)).toBeLessThanOrEqual(PARTING.hover);
    for (let i = 0; i < 60; i++)
      pod.step(STEP, sense(press(at(veil, s, 1, 0))));
    expect(
      valueAt(slot(pod.write().streams.veil.bodies, 1), 3),
    ).toBeGreaterThan(11.6);
    for (let i = 0; i < 120; i++) pod.step(STEP, sense(AWAY));
    expect(slot(pod.write().streams.veil.bodies, 1)).toEqual([0, 0, 1, 0]);
  });

  test("a tap flicks a whale, else plucks the nearest current, else reaches the rig", () => {
    const rig = new Rig();
    const pod = new Pod(haze, rig);
    const under = pod.streams.under;
    const body = at(under, pod.hero.s - 85, pod.hero.lane, 0);
    pod.step(STEP, sense(AWAY, AWAY, [{ kind: "tap", ...body }]));
    expect(pod.mood("hero")).toBe("startled");
    const wakes = pod.write().streams.under.wakes;
    const strengths = Array.from({ length: 8 }, (_, k) =>
      Math.abs(valueAt(wakes, k * 4 + 1)),
    );
    expect(strengths.some((value) => Math.abs(value - 1.2) < 0.01)).toBe(true);
    const off = at(under, under.route.arcAtX(640), 60, pod.time);
    pod.step(STEP, sense(AWAY, AWAY, [{ kind: "tap", ...off }]));
    const plucks = pluckSlots(pod.write(), "under");
    expect(plucks[0]).toBeCloseTo(-0.9 * 0.7, 3);
    const sky = { x: 1080, y: 380 };
    pod.step(STEP, sense(AWAY, AWAY, [{ kind: "tap", ...sky }]));
    expect(rig.taps).toEqual([{ kind: "tap", ...sky }]);
  });

  test("a press that starts in a band plucks toward the hand on release", () => {
    const pod = new Pod(haze);
    const veil = pod.streams.veil;
    const spot = at(veil, 500, -8, 0);
    pod.step(STEP, sense(press(spot), hover(spot)));
    pod.step(STEP, sense(press(spot)));
    pod.step(
      STEP,
      sense(hover(spot), press(spot), [{ kind: "release", ...spot }]),
    );
    const plucks = pluckSlots(pod.write(), "veil");
    expect(plucks[0]).toBeCloseTo(-0.8 * 0.7, 3);
    expect(pod.write().wisps.map((wisp) => wisp.visible)).toEqual([
      false,
      false,
    ]);
  });

  test("a press in open sky draws a wisp that drifts off as a gust", () => {
    const pod = new Pod(haze);
    const origin = { x: 1000, y: 380 };
    pod.step(STEP, sense(press(origin), hover(origin)));
    for (let i = 1; i <= 30; i++)
      pod.step(STEP, sense(press({ x: 1000 + 3 * i, y: 380 }, origin)));
    expect(pod.write().wisps.map((wisp) => wisp.visible)).toEqual([
      true,
      false,
    ]);
    const end = hover({ x: 1090, y: 380 });
    pod.step(STEP, sense(end, end, [{ kind: "release", x: 1090, y: 380 }]));
    expect(pod.write().wisps.map((wisp) => wisp.visible)).toEqual([
      false,
      true,
    ]);
    for (let i = 0; i < 60 * (WISP.life + 1); i++) pod.step(STEP, sense(end));
    expect(pod.write().wisps.map((wisp) => wisp.visible)).toEqual([
      false,
      false,
    ]);
  });

  test("gestures wait for the next tick, and calm() drops them", () => {
    const rig = new Rig();
    const pod = new Pod(haze, rig);
    const sky = { x: 1080, y: 380 };
    pod.step(1 / 144, sense(AWAY, AWAY, [{ kind: "tap", ...sky }]));
    expect(rig.taps).toEqual([]);
    pod.step(1 / 144);
    pod.step(1 / 144);
    expect(rig.taps).toEqual([{ kind: "tap", ...sky }]);
    pod.step(1 / 144, sense(AWAY, AWAY, [{ kind: "tap", ...sky }]));
    pod.calm();
    expect(rig.calmed).toBe(1);
    for (let i = 0; i < 4; i++) pod.step(1 / 144);
    expect(rig.taps).toHaveLength(1);
  });

  test("the rig ticks on the pod clock with the held hand and writes into the frame", () => {
    const rig = new Rig();
    const pod = new Pod(haze, rig);
    const ticks = rig.ticks.length;
    expect(ticks).toBe(PREROLL * 60);
    const hand = hover({ x: 1080, y: 380 });
    pod.step(1 / 30, sense(hand));
    expect(
      rig.ticks.slice(ticks).map((tick) => [tick.time, tick.hand]),
    ).toEqual([
      [STEP, hand],
      [2 * STEP, hand],
    ]);
    expect([...pod.write().rig]).toEqual(new Array(12).fill(0.5));
  });
});

describe("captions with worst-case hands", () => {
  const pod = new Pod(haze);
  const under = pod.streams.under;
  const band = [under.route.arcAtX(860), under.route.arcAtX(1150)] as const;
  const edge: RouteFrame = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
  const stats = {
    heroLow: -Infinity,
    calfLow: -Infinity,
    bandLow: -Infinity,
    startles: 0,
    parted: 0,
    /** Mood lane shifts off each pass's base lane, [min, max]. */
    heroShift: [Infinity, -Infinity],
    calfShift: [Infinity, -Infinity],
  };
  const widen = (range: number[], value: number) => {
    range[0] = Math.min(valueAt(range, 0), value);
    range[1] = Math.max(valueAt(range, 1), value);
  };
  const calfLane = POD.calf.lane;
  let previous: Hand = AWAY,
    frame = pod.write();
  for (let i = 0; i < 60 * 150; i++) {
    const t = pod.time,
      phase = t % 24;
    const sweep = band[0] + ((t % 6) / 6) * (band[1] - band[0]);
    let hand: Hand;
    if (phase < 4) hand = hover(at(under, pod.hero.s + 70, 30, t), 30);
    else if (phase < 8) hand = press(at(under, pod.hero.s + 70, 30, t));
    else if (phase < 11) hand = hover(at(under, sweep, -30, t), 50);
    else if (phase < 14) hand = hover(at(under, sweep, 30, t), 50);
    else if (phase < 17) hand = press(at(under, sweep, 30, t));
    else if (phase < 20) hand = press(at(under, sweep, -30, t));
    else {
      // Fast passes through the hero's midbody, from above, then from below.
      const middle = at(under, pod.hero.s - 85, pod.hero.lane, t);
      const side = Math.floor(t) % 2 ? 1 : -1;
      hand = hover({ x: middle.x, y: middle.y + 60 * side }, 0, 3000 * side);
      if (i % 2 === 0)
        previous = hover({ x: middle.x, y: middle.y - 60 * side });
    }
    const mood = pod.mood("hero");
    pod.step(STEP, sense(hand, previous));
    if (mood !== "startled" && pod.mood("hero") === "startled")
      stats.startles++;
    widen(stats.heroShift, pod.hero.lane - pod.hero.baseLane);
    widen(
      stats.calfShift,
      pod.calf.lane -
        (pod.hero.baseLane +
          calfLane.offset +
          calfLane.amplitude *
            Math.sin((TAU * pod.time) / calfLane.period + calfLane.phase)),
    );
    previous = hand;
    frame = pod.write();
    if (valueAt(frame.streams.under.bodies, 2 * 4 + 3) > 0) stats.parted++;
    for (let k = 0; k < WHALE_VERTICES; k++) {
      const hero = vertex(frame, HERO, k),
        calf = vertex(frame, CALF, k);
      if (hero.x >= 900 && hero.x <= 1110)
        stats.heroLow = Math.max(stats.heroLow, hero.y);
      if (calf.x >= 900 && calf.x <= 1110)
        stats.calfLow = Math.max(stats.calfLow, calf.y);
    }
    if (i % 2 === 0)
      for (let s = band[0]; s <= band[1]; s++) {
        partedEdge(under, frame.streams.under, s, pod.time, edge);
        if (edge.x >= 900 && edge.x <= 1110)
          stats.bandLow = Math.max(stats.bandLow, edge.y);
      }
  }

  test("the scripted hands part the band and startle the hero", () => {
    expect(stats.startles).toBeGreaterThanOrEqual(4);
    expect(stats.parted).toBeGreaterThan(60 * 30);
  });

  test("hero and calf stay above the caption", () => {
    expect(stats.heroLow).toBeLessThanOrEqual(798);
    expect(stats.calfLow).toBeLessThanOrEqual(798);
  });

  test("the undercurrent stays above the caption with the hand body", () => {
    expect(stats.bandLow).toBeLessThanOrEqual(800);
  });

  test("moods move hero and calf only within their caption limits", () => {
    for (const [shift, [low, high]] of [
      [stats.heroShift, LIMITS.hero.lane],
      [stats.calfShift, LIMITS.calf.lane],
    ] as const) {
      expect(valueAt(shift, 0)).toBeGreaterThanOrEqual(low - 1e-9);
      expect(valueAt(shift, 0)).toBeLessThan(-1);
      expect(valueAt(shift, 1)).toBeLessThanOrEqual(high + 1e-9);
    }
    expect(LIMITS.hero.lane).toEqual([-10, 0]);
    expect(LIMITS.calf.lane).toEqual([-10, 0]);
  });
});
