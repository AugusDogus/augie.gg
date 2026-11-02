import { describe, expect, test } from "bun:test";
import { Haze } from "./art-maps";
import { POD, PREROLL, Pod, STEP, WHALE_COUNT, type SkyFrame } from "./pod";
import { type RouteFrame, valueAt } from "./route";
import { BODY_SLOTS, MEANDER, type Stream, WAKE, WAKE_SLOTS } from "./streams";
import { VERTEX_FLOATS, WHALE_VERTICES } from "./whale-body";

const FAR = 0,
  CALF = 1,
  HERO = 2;
const NOSE = 1;
const haze = Haze.flat(0.5, 0.5, 0.5);
const slot = (bodies: Float32Array, k: number) =>
  Array.from({ length: 4 }, (_, i) => valueAt(bodies, k * 4 + i));

/** The ventral band edge at arc s, parted around the live bodies the way the bead shader parts back beads. */
function partedEdge(
  stream: Stream,
  bodies: Float32Array,
  s: number,
  time: number,
  out: RouteFrame,
) {
  let across = stream.halfWidth(s) + MEANDER.amplitude + WAKE.lateral;
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

  test("draws are ordered far, calf, hero with the whale gate on the undercurrent", () => {
    const frame = new Pod(haze).write();
    expect(frame.whales.map((whale) => whale.first)).toEqual([0, 106, 212]);
    expect(frame.vertices).toHaveLength(
      WHALE_COUNT * WHALE_VERTICES * VERTEX_FLOATS,
    );
    expect([...(frame.whales[FAR]?.gate ?? [])]).toEqual([-1e4, -1e4 + 1]);
    expect([...(frame.whales[HERO]?.gate ?? [])]).toEqual([315, 355]);
    expect([...(frame.whales[CALF]?.gate ?? [])]).toEqual([315, 355]);
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
      const { under, high } = pod.write().streams;
      expectBody(slot(under.bodies, 0), pod.hero, pod.hero.opacity);
      expectBody(slot(under.bodies, 1), pod.calf, 1);
      expectBody(slot(high.bodies, 0), pod.far, pod.far.opacity);
      for (const empty of [
        slot(under.bodies, 2),
        slot(high.bodies, 1),
        slot(high.bodies, 2),
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
    const run = (rate: number) => {
      const pod = new Pod(haze);
      for (let i = 0; i < rate; i++) pod.step(1 / rate);
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
      };
    };
    const sixty = run(60);
    expect(sixty.time).toBeCloseTo(1, 9);
    expect(run(30)).toEqual(sixty);
    expect(run(144)).toEqual(sixty);
  });

  test("write() reuses one frame and its typed arrays", () => {
    const arrays = (frame: SkyFrame) => [
      frame.vertices,
      ...frame.whales.flatMap((whale) => [whale.tone, whale.look, whale.gate]),
      ...Object.values(frame.streams).flatMap((stream) => [
        stream.clock,
        stream.bodies,
        stream.wakes,
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
        partedEdge(under, frame.streams.under.bodies, s, pod.time, edge);
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
