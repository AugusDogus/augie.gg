import { describe, expect, test } from "bun:test";
import {
  ATTENTION,
  Attention,
  type Body,
  type Limits,
  type Response,
  SPINE_SAMPLES,
  emptyBody,
  locate,
  spineDistance,
} from "./attention";
import { AWAY, type Hand } from "./instrument";
import { POD } from "./pod";
import { Stream } from "./streams";
import { random } from "./texture";
import { Swimmer } from "./whale-swim";

const H = 1 / 60;
const HERO: Limits = { lane: [-10, 0], bend: [-12, 2] };
const NEUTRAL: Response = {
  laneShift: 0,
  bend: 0,
  rateGain: 1,
  airKick: 0,
  coupling: 1,
};
/** A 170 px whale swimming right with its rostrum at (500, 300). */
function body(length = 170): Body {
  const spine = new Float64Array(SPINE_SAMPLES * 2);
  for (let i = 0; i < SPINE_SAMPLES; i++) {
    spine[i * 2] = 500 - (i / (SPINE_SAMPLES - 1)) * length;
    spine[i * 2 + 1] = 300;
  }
  return { length, visible: true, tx: 1, ty: 0, nx: 0, ny: 1, spine };
}
const hover = (x: number, y: number, vx = 0, vy = 0): Hand => ({
  kind: "hover",
  x,
  y,
  vx,
  vy,
});
/** A fast vertical pass through (x, 300). */
const swipe = (x: number, speed = 1000) => ({
  x0: x,
  y0: 200,
  x1: x,
  y1: 400,
  speed,
});
const expectNeutral = (response: Response) => {
  for (const key of [
    "laneShift",
    "bend",
    "rateGain",
    "airKick",
    "coupling",
  ] as const)
    expect(Object.is(response[key], NEUTRAL[key])).toBe(true);
};

describe("moods", () => {
  test("an undisturbed whale's response is exactly neutral", () => {
    const attention = new Attention(HERO);
    const whale = body();
    for (let i = 0; i < 600; i++)
      expectNeutral(attention.tick(H, i * H, whale, AWAY, null));
    expect(attention.mood.kind).toBe("cruising");
  });

  test("a slow hand ahead of the nose makes it curious after 0.35 s, aloof after 5 s, for 12 s", () => {
    const attention = new Attention(HERO);
    const whale = body();
    const hand = hover(600, 260, 50, 0);
    const changes: [string, number][] = [];
    let last = "cruising",
      bend = 0,
      lane = 0,
      coupling = 1;
    for (let i = 1; i <= 60 * 25; i++) {
      const time = i * H;
      const response = attention.tick(H, time, whale, hand, null);
      if (attention.mood.kind !== last) {
        last = attention.mood.kind;
        changes.push([last, Math.round(time * 1000) / 1000]);
      }
      if (attention.mood.kind === "curious") {
        bend = Math.min(bend, response.bend);
        lane = Math.min(lane, response.laneShift);
        coupling = response.coupling;
      } else expect(response.coupling).toBe(1);
    }
    expect(changes).toEqual([
      ["curious", 0.35],
      ["aloof", 5.35],
      ["cruising", 17.35],
      ["curious", 17.7],
      ["aloof", 22.7],
    ]);
    // Bend toward the hand 40 px above: .25 × −40, and the lane shift clamped at −10.
    expect(bend).toBeCloseTo(-10, 0);
    expect(lane).toBe(-10);
    expect(coupling).toBe(0.55);
  });

  test("curiosity needs a slow hand inside the zone ahead of the nose", () => {
    for (const hand of [
      hover(600, 260, 200, 0),
      hover(700, 300),
      hover(420, 300),
      hover(500, 470),
    ]) {
      const attention = new Attention(HERO);
      for (let i = 1; i <= 120; i++)
        attention.tick(H, i * H, body(), hand, null);
      expect(attention.mood.kind).toBe("cruising");
    }
    const hidden = new Attention(HERO);
    const unseen = { ...body(), visible: false };
    for (let i = 1; i <= 120; i++)
      hidden.tick(H, i * H, unseen, hover(600, 260), null);
    expect(hidden.mood.kind).toBe("cruising");
  });

  test("a fast pass startles once per 6 s and the whale cruises again after 3 s", () => {
    const attention = new Attention(HERO);
    const whale = body();
    const starts: number[] = [];
    for (let i = 1; i <= 60 * 14; i++) {
      const time = i * H;
      const pass = i % 30 === 0 ? swipe(420) : null;
      const response = attention.tick(H, time, whale, AWAY, pass);
      if (response.airKick > 0) starts.push(Math.round(time * 1000) / 1000);
      if (attention.mood.kind === "startled")
        expect(time - attention.mood.since).toBeLessThan(3);
    }
    expect(starts).toEqual([0.5, 6.5, 12.5]);
  });

  test("a startle kicks once, bursts the stroke rate and banks away from the hand", () => {
    const attention = new Attention({ lane: [-8, 6], bend: [-8, 8] });
    const whale = body();
    // The pass ends below the whale, so it banks and flicks dorsal.
    const first = { ...attention.tick(H, H, whale, AWAY, swipe(450)) };
    expect(first.airKick).toBe(1);
    expect(first.rateGain).toBeCloseTo(1 + ATTENTION.startle.gain, 6);
    const second = attention.tick(H, 2 * H, whale, AWAY, null);
    expect(second.airKick).toBe(0);
    let lane = 0,
      bend = 0;
    for (let i = 3; i < 150; i++) {
      const response = attention.tick(H, i * H, whale, AWAY, null);
      lane = Math.min(lane, response.laneShift);
      bend = Math.min(bend, response.bend);
    }
    expect(lane).toBeLessThan(-6);
    expect(bend).toBe(-8);
  });

  test("the startle flick peaks at 10k away from the hand", () => {
    const wide: Limits = { lane: [-50, 50], bend: [-50, 50] };
    for (const length of [170, 96]) {
      const attention = new Attention(wide);
      const whale = body(length);
      let peak = 0;
      attention.tick(H, H, whale, AWAY, swipe(450));
      for (let i = 2; i < 120; i++)
        peak = Math.min(peak, attention.tick(H, i * H, whale, AWAY, null).bend);
      expect(peak).toBeCloseTo((-10 * length) / 170, 1);
    }
  });

  test("passes that are slow or out of reach do not startle", () => {
    for (const pass of [
      swipe(450, 700),
      { x0: 420, y0: 391, x1: 600, y1: 391, speed: 2000 },
      { x0: 230, y0: 200, x1: 230, y1: 400, speed: 2000 },
    ]) {
      const attention = new Attention(HERO);
      attention.tick(H, H, body(), AWAY, pass);
      expect(attention.mood.kind).toBe("cruising");
    }
  });

  test("the calf startles 0.2 s after its mother at 0.8 intensity", () => {
    const mother = new Attention(HERO),
      calf = new Attention(HERO);
    const whale = body(),
      small = body(96);
    let at = -1;
    for (let i = 1; i <= 60; i++) {
      const time = i * H;
      mother.tick(H, time, whale, AWAY, i === 6 ? swipe(400) : null);
      calf.follow(mother, time);
      const response = calf.tick(H, time, small, AWAY, null);
      if (response.airKick > 0) {
        at = time;
        expect(response.airKick).toBeCloseTo(0.8, 9);
        expect(calf.mood).toMatchObject({ kind: "startled", intensity: 0.8 });
      }
    }
    expect(at).toBeCloseTo(0.3, 9);
  });

  test("a calf the same swipe startled does not startle again when it follows", () => {
    const mother = new Attention(HERO),
      calf = new Attention(HERO);
    const whale = body(),
      small = body(96);
    const kicks: number[] = [];
    for (let i = 1; i <= 60; i++) {
      const time = i * H,
        pass = i === 6 ? swipe(420) : null;
      // Pod's order: the mother, then the follow, then the calf with the same swipe.
      mother.tick(H, time, whale, AWAY, pass);
      calf.follow(mother, time);
      if (calf.tick(H, time, small, AWAY, pass).airKick > 0) kicks.push(time);
    }
    expect(kicks).toHaveLength(1);
    expect(kicks[0]).toBeCloseTo(0.1, 9);
    expect(calf.mood).toMatchObject({ kind: "startled", intensity: 1 });
  });

  test("a flick is a weak startle without a bank and outside the refractory clock", () => {
    const attention = new Attention(HERO);
    const whale = body();
    attention.flick(H, -1, whale.length);
    const response = attention.tick(H, H, whale, AWAY, null);
    expect(response.airKick).toBe(ATTENTION.tap.intensity);
    expect(response.rateGain).toBeCloseTo(
      1 + ATTENTION.startle.gain * ATTENTION.tap.intensity,
      6,
    );
    for (let i = 2; i < 120; i++)
      expect(attention.tick(H, i * H, whale, AWAY, null).laneShift).toBe(0);
    attention.tick(H, 2.1, whale, AWAY, swipe(450));
    expect(attention.mood).toMatchObject({ kind: "startled", intensity: 1 });
  });

  test("calm() drops moods and pending startles", () => {
    const mother = new Attention(HERO),
      calf = new Attention(HERO);
    mother.tick(H, H, body(), AWAY, swipe(450));
    calf.follow(mother, H);
    mother.calm();
    calf.calm();
    expect(mother.mood.kind).toBe("cruising");
    for (let i = 2; i < 60; i++) calf.tick(H, i * H, body(96), AWAY, null);
    expect(calf.mood.kind).toBe("cruising");
  });

  test("lane and bend stay inside the limits under scripted hands", () => {
    const limits: readonly Limits[] = [
      HERO,
      { lane: [-8, 6], bend: [-8, 8] },
      { lane: [-4, 4], bend: [-4.5, 4.5] },
    ];
    for (const range of limits) {
      const next = random(42);
      const attention = new Attention(range);
      const whale = body();
      let x = 500,
        y = 300;
      for (let i = 1; i <= 60 * 120; i++) {
        const fast = next() < 0.05;
        const x1 = 300 + next() * 500,
          y1 = 150 + next() * 300;
        const pass = fast
          ? { x0: x, y0: y, x1, y1, speed: 600 + next() * 2000 }
          : null;
        if (fast) [x, y] = [x1, y1];
        else if (next() < 0.02)
          [x, y] = [520 + next() * 150, 220 + next() * 160];
        if (next() < 0.01)
          attention.flick(i * H, next() < 0.5 ? 1 : -1, whale.length);
        const response = attention.tick(H, i * H, whale, hover(x, y), pass);
        expect(response.laneShift).toBeGreaterThanOrEqual(range.lane[0]);
        expect(response.laneShift).toBeLessThanOrEqual(range.lane[1]);
        expect(response.bend).toBeGreaterThanOrEqual(range.bend[0]);
        expect(response.bend).toBeLessThanOrEqual(range.bend[1]);
      }
    }
  });
});

describe("startled strokes", () => {
  test("a startle adds at least two stroke wakes within 1.5 s", () => {
    const under = new Stream("under");
    const strokes = (s0: number, phase: number, startle: boolean) => {
      const air = POD.hero.cruise * (1 - POD.hero.relax * under.coupling(s0));
      const whale = new Swimmer(POD.hero, s0, phase, 10, air);
      for (let i = 0; i < 300; i++) whale.step(H, under);
      const attention = new Attention(HERO);
      const at = emptyBody();
      let count = 0;
      for (let i = 0; i < 90; i++) {
        locate(at, whale, under, i * H, true);
        const x = at.spine[4] ?? 0,
          y = at.spine[5] ?? 0;
        const pass =
          startle && i === 0
            ? { x0: x, y0: y - 30, x1: x, y1: y + 30, speed: 1200 }
            : null;
        whale.respond(attention.tick(H, i * H, at, AWAY, pass));
        if (whale.step(H, under)) count++;
      }
      return count;
    };
    for (const s0 of [450, 750, 1050])
      for (let k = 0; k < 16; k++) {
        const phase = (k / 16) * Math.PI * 2;
        expect(
          strokes(s0, phase, true) - strokes(s0, phase, false),
        ).toBeGreaterThanOrEqual(2);
      }
  });

  test("locate puts the rostrum and spine on the whale's lane", () => {
    const under = new Stream("under");
    const at = locate(
      emptyBody(),
      { s: 700, lane: -14, phase: 0, length: 170, bend: 0 },
      under,
      3,
      true,
    );
    const frame = under.centerline(700, 3, {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      nx: 0,
      ny: 0,
    });
    expect(at.spine[0]).toBeCloseTo(frame.x - 14 * frame.nx, 9);
    expect(at.spine[1]).toBeCloseTo(frame.y - 14 * frame.ny, 9);
    expect(
      spineDistance(at, frame.x - 14 * frame.nx, frame.y - 14 * frame.ny),
    ).toBe(0);
    expect(
      spineDistance(at, frame.x + 20 * frame.nx, frame.y + 20 * frame.ny),
    ).toBeCloseTo(34, 0);
  });
});
