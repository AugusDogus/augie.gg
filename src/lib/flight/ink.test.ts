import { describe, expect, test } from "bun:test";
import { INK, type Level3, printCell } from "./ink";
import { valueAt } from "./route";
import { smoothstep } from "./streams";
import { bayerIndex } from "./texture";

const DARK = [0.1, 0.25, 0.3] as const,
  BRIGHT = [0.95, 0.97, 0.99] as const;
const grey = (luma: number) => [luma, luma, luma] as const;
const BASES: Level3[] = [];
for (let r = 0; r < 4; r++)
  for (let g = 0; g < 4; g++) for (let b = 0; b < 4; b++) BASES.push([r, g, b]);
const clamp3 = (value: number) => Math.max(0, Math.min(3, value));

describe("adaptive ink", () => {
  test("zero steps change nothing", () => {
    for (const base of BASES)
      for (const tone of [DARK, BRIGHT, grey(0.7)])
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++)
            expect(printCell(base, 0, tone, x, y)).toEqual(base);
  });

  test("a dark tone lifts every channel by the step count", () => {
    for (const base of BASES)
      for (const steps of [1, 2] as const)
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++)
            expect(printCell(base, steps, DARK, x, y)).toEqual([
              clamp3(base[0] + steps),
              clamp3(base[1] + steps),
              clamp3(base[2] + steps),
            ]);
  });

  test("a bright tone sinks faces to R-1 and folds to R-2, G-1, B-1", () => {
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        expect(printCell([3, 3, 3], 1, BRIGHT, x, y)).toEqual([2, 3, 3]);
        expect(printCell([3, 3, 3], 2, BRIGHT, x, y)).toEqual([1, 2, 2]);
        expect(printCell([1, 0, 2], 2, BRIGHT, x, y)).toEqual([0, 0, 1]);
      }
  });

  test("no channel moves more than two levels", () => {
    for (const base of BASES)
      for (const steps of [0, 1, 2] as const)
        for (let luma = 0; luma <= 1; luma += 1 / 32)
          for (let y = 0; y < 4; y++)
            for (let x = 0; x < 4; x++) {
              const printed = printCell(base, steps, grey(luma), x, y);
              printed.forEach((level, c) => {
                expect(Number.isInteger(level)).toBe(true);
                expect(level).toBeGreaterThanOrEqual(0);
                expect(level).toBeLessThanOrEqual(3);
                expect(Math.abs(level - valueAt(base, c))).toBeLessThanOrEqual(
                  2,
                );
              });
            }
  });

  test("the sinking fraction over 16 ranks follows smoothstep across the band", () => {
    const [low, high] = INK.band;
    for (let luma = low; luma <= high + 1e-9; luma += (high - low) / 36) {
      let sinking = 0;
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++)
          if (printCell([3, 3, 3], 1, grey(luma), x, y)[0] === 2) sinking++;
      expect(
        Math.abs(sinking / 16 - smoothstep(low, high, luma)),
      ).toBeLessThanOrEqual(1 / 16);
    }
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        expect(printCell([3, 3, 3], 1, grey(low), x, y)).toEqual([3, 3, 3]);
  });

  test("polarity reads the Bayer rank shifted by INK.rank, off the colour lattice", () => {
    // Mid-band strength is 0.5, so exactly the cells with shifted rank below 8 sink.
    const luma = (INK.band[0] + INK.band[1]) / 2;
    const [dx, dy] = INK.rank;
    let differs = false;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const sunk = printCell([3, 3, 3], 1, grey(luma), x, y)[0] === 2;
        expect(sunk).toBe(bayerIndex(x + dx, y + dy) < 8);
        if (sunk !== bayerIndex(x, y) < 8) differs = true;
      }
    expect(differs).toBe(true);
  });
});
