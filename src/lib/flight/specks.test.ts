import { expect, test } from "bun:test";
import { Specks, forEachSpeckMark } from "./specks";

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

test("trails emit 0.03 specks per px of pointer travel", () => {
  const specks = new Specks();
  specks.step(1 / 30, 1, { x: 0.2, y: 0.5, active: true });
  // 10 px stays under one emission, so only 0.03 per px leaves 0.3 behind.
  specks.step(1 / 30, 1 + 1 / 30, { x: 0.2 + 10 / 1200, y: 0.5, active: true });
  expect(specks.emission).toBeCloseTo(0.3, 9);
});

test("speck marks paint every white speck before any cyan one, crosses as two bars", () => {
  const marks: { rect: number[]; alpha: number; cyan: boolean }[] = [];
  const specks = new Specks();
  forEachSpeckMark(specks.points, (x, y, width, height, alpha, cyan) =>
    marks.push({ rect: [x, y, width, height], alpha, cyan }),
  );
  // 300 specks: every fifth cyan, every fourth a cross.
  expect(marks.filter((mark) => !mark.cyan)).toHaveLength(240 + 60);
  expect(marks.filter((mark) => mark.cyan)).toHaveLength(60 + 15);
  const firstCyan = marks.findIndex((mark) => mark.cyan);
  expect(marks.slice(firstCyan).every((mark) => mark.cyan)).toBe(true);
  // Speck 0 is a cyan cross of depth 0.15: a horizontal bar, then a vertical one.
  const size = 0.9 + 0.15 ** 2 * 3;
  const cross = marks.slice(firstCyan, firstCyan + 2);
  expect(cross.map((mark) => mark.rect)).toEqual([
    [-size, 0, size * 2, 0.85],
    [0, -size, 0.85, size * 2],
  ]);
  expect(at(cross, 0).alpha).toBeCloseTo(0.28 + 0.15 * 0.5, 9);
  // Speck 1 is the first white one, a plain mark.
  const point = at(specks.points, 1);
  const plain = 0.9 + point.depth ** 2 * 3;
  expect(at(marks, 0).rect).toEqual([point.x, point.y, plain, plain * 0.75]);
});
