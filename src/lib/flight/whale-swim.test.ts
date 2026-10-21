import { expect, test } from "bun:test";
import { WhaleSwim } from "./whale-swim";

const create = () =>
  new WhaleSwim({
    x: 460,
    y: 640,
    scale: 150,
    heading: 0,
    phase: 0,
    depth: 0.85,
  });

test("tail strokes supply thrust while the whale carries momentum between strokes", () => {
  const pushing = create();
  const gliding = create();
  gliding.phase = Math.PI / 2;
  pushing.step(1 / 60);
  gliding.step(1 / 60);
  expect(pushing.speed).toBeGreaterThan(gliding.speed);
  expect(gliding.speed).toBeGreaterThan(gliding.cruiseSpeed * 0.9);
  expect(pushing.speed).toBeLessThan(34);
});

test("whales travel forward without turning back at the frame edges", () => {
  for (const heading of [0, Math.PI]) {
    const whale = create();
    whale.heading = heading;
    const direction = Math.cos(heading);
    let previous = { ...whale.head };
    for (let i = 0; i < 60 * 180; i++) {
      whale.step(1 / 60);
      const dx = whale.head.x - previous.x;
      if (dx * direction <= 0 || Math.hypot(dx, whale.head.y - previous.y) > 1)
        throw new Error("Whale reversed or jumped during its crossing");
      previous = { ...whale.head };
    }
    expect(whale.heading).toBe(heading);
  }
});

test("the swimming wave moves the flukes much more than the head", () => {
  const whale = create();
  const head = whale.project(0.95, 0),
    tail = whale.project(-1.1, 0);
  whale.phase += Math.PI / 2;
  const headMovement = Math.hypot(
    whale.project(0.95, 0).x - head.x,
    whale.project(0.95, 0).y - head.y,
  );
  const tailMovement = Math.hypot(
    whale.project(-1.1, 0).x - tail.x,
    whale.project(-1.1, 0).y - tail.y,
  );
  expect(tailMovement).toBeGreaterThan(headMovement * 2);
});

test("the torso does not bob independently of its direction of travel", () => {
  const whale = create();
  const before = [0.95, 0.3, -0.15].map((x) => whale.project(x, 0));
  whale.phase += Math.PI / 2;
  expect([0.95, 0.3, -0.15].map((x) => whale.project(x, 0))).toEqual(before);
});

test("body pitch follows the shallow climb or dive in either travel direction", () => {
  for (const heading of [0, Math.PI]) {
    const whale = create();
    whale.heading = heading;
    const before = { ...whale.head };
    whale.step(1 / 60);
    const nose = whale.project(1, 0);
    const torso = whale.project(0, 0);
    const bodySlope = (nose.y - torso.y) / (nose.x - torso.x);
    const travelSlope = (whale.head.y - before.y) / (whale.head.x - before.x);
    expect(bodySlope).toBeCloseTo(travelSlope, 3);
    expect(Math.abs(bodySlope)).toBeGreaterThan(0.02);
  }
});

test("a full tail stroke takes about five seconds", () => {
  const whale = create();
  for (let i = 0; i < 300; i++) whale.step(1 / 60);
  expect(whale.phase).toBeGreaterThan(5.5);
  expect(whale.phase).toBeLessThan(6.6);
});

test("horizontal fluke lobes rise and fall together instead of swinging sideways", () => {
  const whale = create();
  const left = whale.project(-1.1, 0.04, -0.3, "fluke");
  const right = whale.project(-1.1, 0.04, 0.3, "fluke");
  whale.phase += Math.PI / 2;
  const nextLeft = whale.project(-1.1, 0.04, -0.3, "fluke");
  const nextRight = whale.project(-1.1, 0.04, 0.3, "fluke");
  expect(nextLeft.y - left.y).toBeGreaterThan(15);
  expect(nextLeft.y - left.y).toBeCloseTo(nextRight.y - right.y, 6);
  expect(Math.hypot(right.x - left.x, right.y - left.y)).toBeGreaterThan(20);
});

test("a turn foreshortens the body without flipping its belly above its back", () => {
  const whale = create();
  whale.heading = Math.PI;
  expect(whale.project(0.3, 0.2).y).toBeGreaterThan(whale.project(0.3, -0.2).y);
  whale.heading = Math.PI / 2;
  const nose = whale.project(1, 0),
    tail = whale.project(-1, 0);
  expect(Math.abs(nose.x - tail.x)).toBeLessThan(1);
});

test("render wrapping happens only when the whole whale is outside the artwork", () => {
  for (const heading of [0, Math.PI]) {
    const whale = create();
    whale.heading = heading;
    let offset = whale.frameOffsetX;
    let previous = [whale.project(1, 0).x, whale.project(-1.2, 0).x];
    let wraps = 0;
    for (let i = 0; i < 60 * 600; i++) {
      whale.step(1 / 60);
      const points = [whale.project(1, 0).x, whale.project(-1.2, 0).x];
      if (whale.frameOffsetX !== offset) {
        const before = previous.map((x) => x - offset);
        const after = points.map((x) => x - whale.frameOffsetX);
        expect(
          before.every((x) => x < 0) || before.every((x) => x > 1200),
        ).toBe(true);
        expect(after.every((x) => x < 0) || after.every((x) => x > 1200)).toBe(
          true,
        );
        wraps++;
      }
      offset = whale.frameOffsetX;
      previous = points;
      if (
        !Number.isFinite(whale.head.y) ||
        whale.head.y < 60 ||
        whale.head.y > 780
      )
        throw new Error("Whale left its vertical passage");
    }
    expect(wraps).toBeGreaterThan(5);
  }
});

test("whales return within three seconds of fully leaving the frame", () => {
  for (const heading of [0, Math.PI]) {
    const whale = create();
    whale.heading = heading;
    let hiddenFrames = 0;
    let returns = 0;
    for (let i = 0; i < 60 * 180; i++) {
      whale.step(1 / 60);
      const nose = whale.project(1, 0).x - whale.frameOffsetX;
      const tail = whale.project(-1.2, 0).x - whale.frameOffsetX;
      const visible = Math.max(nose, tail) >= 0 && Math.min(nose, tail) <= 1200;
      if (!visible) hiddenFrames++;
      else if (hiddenFrames > 0) {
        expect(hiddenFrames / 60).toBeGreaterThan(1);
        expect(hiddenFrames / 60).toBeLessThan(3);
        hiddenFrames = 0;
        returns++;
      }
    }
    expect(returns).toBeGreaterThan(2);
  }
});
