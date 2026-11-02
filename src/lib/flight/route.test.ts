import { describe, expect, test } from "bun:test";
import {
  ROUTE_SAMPLES,
  Route,
  type Point,
  type RouteFrame,
  valueAt,
} from "./route";

const controls: Point[] = [
  [200, 840],
  [330, 815],
  [450, 785],
  [580, 748],
  [720, 748],
  [860, 752],
  [1000, 748],
  [1120, 746],
  [1250, 730],
];
const route = new Route(controls);
const frame = (s: number): RouteFrame =>
  route.frame(s, { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 });

describe("route", () => {
  test("passes through every control point", () => {
    for (const [x, y] of controls) {
      const point = frame(route.arcAtX(x));
      expect(Math.abs(point.x - x)).toBeLessThan(1);
      expect(Math.abs(point.y - y)).toBeLessThan(1);
    }
  });

  test("samples are equal arc steps with unit normals", () => {
    expect(route.step).toBeCloseTo(route.length / (ROUTE_SAMPLES - 1), 9);
    for (let i = 0; i < ROUTE_SAMPLES; i++) {
      const at = (offset: number) => valueAt(route.table, i * 4 + offset);
      expect(Math.hypot(at(2), at(3))).toBeCloseTo(1, 5);
      if (i === 0) continue;
      const chord = Math.hypot(
        at(0) - valueAt(route.table, i * 4 - 4),
        at(1) - valueAt(route.table, i * 4 - 3),
      );
      expect(Math.abs(chord / route.step - 1)).toBeLessThan(0.01);
    }
  });

  test("frame() extrapolates linearly past both ends", () => {
    for (const [edge, direction] of [
      [0, -1],
      [route.length, 1],
    ] as const) {
      const end = frame(edge);
      const near = frame(edge + direction * 10),
        far = frame(edge + direction * 40);
      expect(far.x - end.x).toBeCloseTo((near.x - end.x) * 4, 3);
      expect(far.y - end.y).toBeCloseTo((near.y - end.y) * 4, 3);
      expect(far.nx).toBeCloseTo(near.nx, 6);
      expect(far.ny).toBeCloseTo(near.ny, 6);
    }
  });

  test("arcAtX inverts frame().x", () => {
    for (let x = 100; x <= 1400; x += 7)
      expect(Math.abs(frame(route.arcAtX(x)).x - x)).toBeLessThan(0.5);
  });

  test("the tangent points right and the normal points down", () => {
    for (let s = -300; s <= route.length + 300; s += 1) {
      const point = frame(s);
      expect(point.tx).toBeGreaterThan(0.9);
      expect(point.ny).toBeGreaterThan(0.9);
      expect(point.nx).toBeCloseTo(-point.ty, 12);
    }
  });

  test("valueAt guards missing indices", () => {
    expect(valueAt([1, 2], 1)).toBe(2);
    expect(() => valueAt([1, 2], 2)).toThrow(RangeError);
  });
});
