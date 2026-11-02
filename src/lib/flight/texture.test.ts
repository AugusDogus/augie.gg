import { describe, expect, test } from "bun:test";
import {
  bayerIndex,
  contrastChannel,
  ditherChannel,
  latticeLevel,
  random,
} from "./texture";

describe("ordered dither", () => {
  test("preserves pure black and white", () => {
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        expect(ditherChannel(0, x, y)).toBe(0);
        expect(ditherChannel(255, x, y)).toBe(255);
      }
  });
  test("a midpoint produces a balanced Bayer tile", () => {
    const tile = Array.from({ length: 16 }, (_, i) =>
      ditherChannel(127.5, i % 4, Math.floor(i / 4)),
    );
    expect(tile.filter((value) => value === 85)).toHaveLength(8);
    expect(tile.filter((value) => value === 170)).toHaveLength(8);
    expect(tile.reduce((sum, value) => sum + value, 0) / 16).toBe(127.5);
  });
  test("contrast clamps highlights and shadows", () => {
    expect(contrastChannel(255, 180)).toBe(255);
    expect(contrastChannel(0, 180)).toBe(0);
    expect(contrastChannel(127.5, 110)).toBe(127.5);
  });
  test("the closed-form Bayer rank equals the approved table", () => {
    const table = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        expect(bayerIndex(x, y)).toBe(table[(y % 4) * 4 + (x % 4)] ?? -1);
    expect(() => bayerIndex(-1, 0)).toThrow(RangeError);
    expect(() => bayerIndex(0.5, 0)).toThrow(RangeError);
  });
  test("latticeLevel re-prints the bake for every value and rank", () => {
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const t = (bayerIndex(x, y) + 0.5) / 16;
        for (let v = 0; v < 256; v++)
          expect(latticeLevel(v / 255, t) * 85).toBe(
            ditherChannel(contrastChannel(v, 110), x, y),
          );
      }
  });
  test("unclamped lattice inputs stay clear of every level edge", () => {
    // The lattice input times 13600 is 176v + 425(2r + 1) - 2040, always odd,
    // so it sits at least 1/13600 from an edge: GPU float error cannot flip a level.
    const margin = 7e-5;
    for (let rank = 0; rank < 16; rank++)
      for (let v = 0; v < 256; v++) {
        const contrasted = contrastChannel(v, 110);
        if (contrasted === 0 || contrasted === 255) continue;
        const t = (rank + 0.5) / 16;
        expect([v, rank, latticeLevel(v / 255, t - margin)]).toEqual([
          v,
          rank,
          latticeLevel(v / 255, t + margin),
        ]);
      }
  });
  test("the grain generator keeps its sequence", () => {
    const next = random(1607);
    expect([next(), next(), next()]).toEqual([
      0.858864723239094, 0.039517525816336274, 0.14572740998119116,
    ]);
  });
});
