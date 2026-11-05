import { describe, expect, test } from "bun:test";
import { Aim } from "./aim";

// A row's right half at y = 500, the stage 100px to the right of the list.
const origin = { x: 560, y: 500 };
const stage = { left: 700, top: 120, bottom: 820 };

describe("Aim.toward", () => {
  test("a move straight across to the stage is heading for it", () => {
    expect(Aim.toward(origin, stage, { x: 600, y: 500 })).toBe(true);
  });

  test("a diagonal toward the stage's top, across the rows above, is heading for it", () => {
    expect(Aim.toward(origin, stage, { x: 620, y: 420 })).toBe(true);
    expect(Aim.toward(origin, stage, { x: 680, y: 200 })).toBe(true);
  });

  test("a move down the list to the next row is not", () => {
    expect(Aim.toward(origin, stage, { x: 560, y: 540 })).toBe(false);
    expect(Aim.toward(origin, stage, { x: 566, y: 560 })).toBe(false);
  });

  test("moving back left, away from the stage, is not", () => {
    expect(Aim.toward(origin, stage, { x: 520, y: 500 })).toBe(false);
  });

  test("passing above or below the stage is not", () => {
    expect(Aim.toward(origin, stage, { x: 690, y: 100 })).toBe(false);
    expect(Aim.toward(origin, stage, { x: 690, y: 840 })).toBe(false);
  });
});
