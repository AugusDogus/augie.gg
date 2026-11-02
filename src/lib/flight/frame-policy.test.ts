import { expect, test } from "bun:test";
import { type FrameCap, FramePolicy } from "./frame-policy";

/** Rendered frames over `seconds` of rAF ticks at `hz`, after the first frame. */
function rendered(policy: FramePolicy, hz: number, seconds = 1, start = 0) {
  policy.ready(start);
  let count = 0;
  for (let k = 1; k <= hz * seconds; k++)
    if (policy.ready(start + (k * 1000) / hz)) count++;
  return count;
}

test("render rate follows the cap on common refresh rates", () => {
  for (const [cap, hz, expected] of [
    [60, 60, 60],
    [60, 75, 75],
    [60, 90, 45],
    [60, 120, 60],
    [60, 144, 72],
    [60, 165, 55],
    [30, 60, 30],
    [30, 144, 28],
  ] as const satisfies readonly (readonly [FrameCap, number, number])[])
    expect(rendered(new FramePolicy(cap), hz)).toBe(expected);
});

test("dt is the clamped gap, and 0 on the first frame after reset", () => {
  const policy = new FramePolicy(60);
  expect(policy.ready(1000)).toBe(true);
  expect(policy.dt).toBe(0);
  expect(policy.ready(1010)).toBe(false);
  expect(policy.ready(1020)).toBe(true);
  expect(policy.dt).toBeCloseTo(0.02, 9);
  expect(policy.ready(1500)).toBe(true);
  expect(policy.dt).toBe(0.06);
  policy.reset();
  expect(policy.ready(1501)).toBe(true);
  expect(policy.dt).toBe(0);
});

test("sustained slow frames drop to 30 fps for good", () => {
  const policy = new FramePolicy(60);
  rendered(policy, 30, 10);
  expect(policy.cap).toBe(30);
  policy.reset();
  expect(rendered(policy, 60, 10, 20000)).toBe(300);
  expect(policy.cap).toBe(30);
});

test("slow frames during warm-up or a single stall do not degrade", () => {
  const warming = new FramePolicy(60);
  rendered(warming, 30, 4);
  expect(warming.cap).toBe(60);

  const stalled = new FramePolicy(60);
  rendered(stalled, 60, 5);
  stalled.ready(5250);
  rendered(stalled, 60, 10, 5250);
  expect(stalled.cap).toBe(60);
});
