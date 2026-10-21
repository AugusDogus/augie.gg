import { expect, test } from "bun:test";
import { Specks } from "./specks";

function at<T>(values: ArrayLike<T>, index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Missing test sample ${index}`);
  return value;
}

test("specks drift independently without cursor input", () => {
  const specks = new Specks();
  const initial = specks.snapshot();
  specks.step(1 / 30, 1);
  expect(specks.points.every((point, i) => point.x !== at(initial, i).x)).toBe(
    true,
  );
  expect(at(specks.points, 1).x - at(initial, 1).x).not.toBeCloseTo(
    at(specks.points, 2).x - at(initial, 2).x,
    3,
  );
});

test("specks wrap within the artwork and export snapshots stay frozen", () => {
  const specks = new Specks();
  const frozen = specks.snapshot();
  const first = { ...at(frozen, 0) };
  for (let i = 0; i < 600; i++) specks.step(0.1, i * 0.1);
  expect(
    specks.points.every((p) => p.x >= 0 && p.x < 1200 && p.y >= 0 && p.y < 874),
  ).toBe(true);
  expect(at(frozen, 0)).toEqual(first);
  expect(specks.snapshot()[0]).not.toEqual(first);
});

test("fast pointer movement emits a sparse fading trail", () => {
  const specks = new Specks();
  const initial = specks.points.length;
  specks.step(1 / 60, 1, { x: 0.2, y: 0.5, active: true });
  for (let i = 1; i < 8; i++)
    specks.step(1 / 60, 1 + i / 60, {
      x: 0.2 + i * 0.03,
      y: 0.5,
      active: true,
    });
  expect(specks.points.length).toBeGreaterThan(initial);
  expect(specks.points.some((point) => point.trail && point.life < 1.2)).toBe(
    true,
  );
  for (let i = 0; i < 90; i++) specks.step(1 / 60, 2 + i / 60);
  expect(specks.points.every((point) => !point.trail)).toBe(true);
});
