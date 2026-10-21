import { expect, test } from "bun:test";
import { Whales } from "./whales";
import { ReactionField } from "./reaction-field";
import { whaleContains } from "./whale-shape";

function at<T>(values: ArrayLike<T>, index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Missing test sample ${index}`);
  return value;
}

test("whale geometry includes a rounded body, tail flukes, and a long pectoral fin", () => {
  expect(whaleContains(0.6, 0)).toBe(true);
  expect(whaleContains(-1.08, -0.2)).toBe(true);
  expect(whaleContains(-0.1, 0.5)).toBe(true);
  expect(whaleContains(0.8, 0.5)).toBe(false);
});

test("whales keep flying and evolving independently while export snapshots stay frozen", () => {
  const whales = new Whales();
  const frozen = whales.snapshot();
  const first = { ...at(frozen, 0) };
  for (let i = 0; i < 60; i++) whales.step(1 / 60);
  expect(at(whales.snapshot(), 0).x).not.toBe(first.x);
  expect(
    whales.snapshot().some((p, i) => p.pattern !== at(frozen, i).pattern),
  ).toBe(true);
  expect(at(frozen, 0)).toEqual(first);
});

test("whale physics gives the same result at 30 and 60 updates per second", () => {
  const a = new Whales(),
    b = new Whales();
  for (let i = 0; i < 30; i++) a.step(1 / 30);
  for (let i = 0; i < 60; i++) b.step(1 / 60);
  expect(a.snapshot()).toEqual(b.snapshot());
});

test("offscreen re-entry moves the rendered pod without pulling its spring particles across the scene", () => {
  const whales = new Whales();
  for (const [index, whale] of whales.swimmers.entries()) {
    const margin = whale.length + whale.cruiseSpeed;
    const nextX = index === 0 ? 1200 + margin - 0.1 : -margin + 0.1;
    const shift = nextX - whale.head.x;
    whale.head.x = nextX;
    for (const point of whales.points)
      if (point.whale === index) point.x += shift;
  }
  const before = whales.snapshot();
  whales.step(1 / 60);
  const after = whales.snapshot();
  for (const [i, point] of whales.points.entries()) {
    expect(
      point.whale === 0 ? at(before, i).x > 1200 : at(before, i).x < 0,
    ).toBe(true);
    expect(point.whale === 0 ? at(after, i).x < 0 : at(after, i).x > 1200).toBe(
      true,
    );
    expect(Math.hypot(point.vx, point.vy)).toBeLessThan(2);
  }
});

test("reaction-diffusion evolves a nonuniform pattern without invalid concentrations", () => {
  const field = new ReactionField();
  const before = field.v.slice();
  field.seed(0.5, 0.5);
  field.step(120);
  expect(
    field.v.some((value, i) => Math.abs(value - at(before, i)) > 0.05),
  ).toBe(true);
  expect(
    [...field.u, ...field.v].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    ),
  ).toBe(true);
  expect(Math.max(...field.v) - Math.min(...field.v)).toBeGreaterThan(0.2);
});
