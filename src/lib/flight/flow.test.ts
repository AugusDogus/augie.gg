import { expect, test } from "bun:test";
import { Flow, brushAt, MAX_PUSH, BRUSH_RADIUS } from "./flow";

test("pointer movement produces a local directional push, not global camera motion", () => {
  const flow = new Flow();
  flow.step(1 / 30, { x: 0.4, y: 0.5, active: true });
  flow.step(1 / 30, { x: 0.45, y: 0.5, active: true });
  const near = brushAt(flow.snapshot(), 540, 437);
  const far = brushAt(flow.snapshot(), 50, 50);
  expect(near.x).toBeGreaterThan(8);
  expect(near.x).toBeLessThanOrEqual(MAX_PUSH);
  expect(near.y).toBe(0);
  expect(Math.hypot(far.x, far.y)).toBeLessThan(0.01);
  expect(brushAt(flow.snapshot(), 540 + BRUSH_RADIUS, 437)).toEqual({
    x: 0,
    y: 0,
  });
  expect(brushAt(flow.snapshot(), 540 + BRUSH_RADIUS / 2, 437).x).toBeLessThan(
    near.x,
  );
});

test("the brush retains a short tail then settles, with bounded history", () => {
  const flow = new Flow();
  for (let i = 0; i < 100; i++)
    flow.step(1 / 60, { x: i / 100, y: 0.5, active: true });
  expect(flow.brushes.length).toBeLessThanOrEqual(8);
  const before = brushAt(flow.snapshot(), 1188, 437).x;
  flow.step(0.1, { x: 0.99, y: 0.5, active: false });
  const tail = brushAt(flow.snapshot(), 1188, 437).x;
  expect(tail).toBeGreaterThan(0);
  expect(tail).toBeLessThan(before);
  for (let i = 0; i < 120; i++)
    flow.step(1 / 60, { x: 0.99, y: 0.5, active: false });
  expect(flow.brushes).toHaveLength(0);
});

test("entering or holding still does not create a pulse, and snapshots stay frozen", () => {
  const flow = new Flow();
  for (let i = 0; i < 10; i++)
    flow.step(1 / 30, { x: 0.9, y: 0.1, active: true });
  expect(flow.brushes).toHaveLength(0);
  const frozen = flow.snapshot();
  flow.step(1 / 30, { x: 0.8, y: 0.1, active: true });
  expect(frozen.brushes).toHaveLength(0);
  expect(flow.brushes).toHaveLength(1);
});
