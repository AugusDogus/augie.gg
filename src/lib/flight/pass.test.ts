import { describe, expect, test } from "bun:test";
import { Haze } from "./art-maps";
import { Pass } from "./pass";
import { POD, Pod, STEP } from "./pod";

/** Where the pod's whales are `seconds` after t = 0, with no visitor. */
function podAt(seconds: number) {
  const pod = new Pod(Haze.flat(0.5, 0.5, 0.5));
  for (let tick = 0; tick < Math.round(seconds / STEP); tick++) pod.step(STEP);
  const frame = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
  const { under, veil } = pod.streams;
  return {
    hero: under.route.frame(pod.hero.s, frame).x,
    heroBeforeGate: pod.hero.s < (under.gate?.[0] ?? -Infinity),
    drift: veil.route.frame(pod.drift.s, frame).x,
    driftOpacity: pod.drift.opacity,
    cycle: pod.hero.cycle,
  };
}

describe("Pass.find", () => {
  const pass = Pass.find();

  test("runs from one time the mother is sent back upstream to the next", () => {
    expect(podAt(pass.start - 0.1).cycle).toBe(podAt(pass.start).cycle - 1);
    expect(podAt(pass.start + pass.seconds).cycle).toBe(
      podAt(pass.start).cycle + 1,
    );
    expect(podAt(pass.start + pass.seconds - 0.1).cycle).toBe(
      podAt(pass.start).cycle,
    );
  });

  test("leaves a while at either end when the mother has yet to come through the cloud", () => {
    expect(pass.clear).toBeGreaterThan(0.75);
    for (const end of [pass.start, pass.start + pass.seconds])
      expect(podAt(end + pass.clear - 0.05).heroBeforeGate).toBe(true);
  });

  test("ends with the drift whale where it began, so only the far whale is out of step", () => {
    const begins = podAt(pass.start),
      ends = podAt(pass.start + pass.seconds);
    expect(Math.abs(ends.drift - begins.drift)).toBeLessThan(2);
    expect(ends.driftOpacity).toBeCloseTo(begins.driftOpacity, 2);
  });

  test("opens with the mother's nose where the site first shows it", () => {
    const opening = podAt(pass.start + pass.opening);
    expect(Math.abs(opening.hero - POD.hero.startX)).toBeLessThan(2);
  });
});

describe("Pass.frames", () => {
  const pass = { start: 47.03, seconds: 31.12, clear: 1.3, opening: 14.3 };
  const frames = Pass.frames(pass, 30, 0.5);

  test("starts on the first frame at or after the mother is sent back", () => {
    expect(frames.skip).toBe(1411);
    expect(frames.skip / 30).toBeGreaterThan(pass.start);
  });

  test("runs the pass to the next whole frame, with the dissolve past its end", () => {
    expect(frames.pass).toBe(934);
    expect(frames.dissolve).toBe(15);
    expect(frames.opening).toBe(429);
  });

  test("refuses a dissolve that would still be running when the mother shows", () => {
    expect(() => Pass.frames(pass, 30, 1.3)).toThrow(/dissolve/);
  });
});

describe("Pass.far", () => {
  const frames = { skip: 0, pass: 900, dissolve: 15, opening: 400 };

  test("hides the far whale for the dissolve at either end", () => {
    for (const frame of [0, 14, 900, 914])
      expect(Pass.far(frames, frame, 60)).toBe(0);
  });

  test("brings it in after the first dissolve and out before the last", () => {
    expect(Pass.far(frames, 45, 60)).toBeCloseTo(0.5);
    expect(Pass.far(frames, 75, 60)).toBe(1);
    expect(Pass.far(frames, 500, 60)).toBe(1);
    expect(Pass.far(frames, 840, 60)).toBe(1);
    expect(Pass.far(frames, 870, 60)).toBeCloseTo(0.5);
  });
});
