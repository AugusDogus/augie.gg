import { describe, expect, test } from "bun:test";
import { FAR, Haze, NEAR, OCCLUDERS, occluderMask } from "./art-maps";
import { valueAt } from "./route";

const WIDTH = 600,
  HEIGHT = 437;
/** A synthetic sample filled by a per-cell grey function. */
function raster(grey: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const value = grey(x, y);
      data.set([value, value, value, 255], (y * WIDTH + x) * 4);
    }
  return { data, width: WIDTH, height: HEIGHT };
}
/** Cell containing painting point (px, py). */
const cell = (px: number, py: number) =>
  Math.floor(py / 2) * WIDTH + Math.floor(px / 2);

describe("occluder mask", () => {
  test("keys light paint inside the occluder boxes only", () => {
    const bright = occluderMask(raster(() => 240));
    const dark = occluderMask(raster(() => 40));
    expect(bright).toHaveLength(WIDTH * HEIGHT);
    expect(valueAt(bright, cell(400, 800))).toBe(255);
    expect(valueAt(bright, cell(900, 600))).toBe(255);
    expect(valueAt(bright, cell(100, 800))).toBe(0);
    expect(valueAt(bright, cell(400, 300))).toBe(0);
    expect(valueAt(bright, cell(1150, 600))).toBe(0);
    expect(valueAt(dark, cell(400, 800))).toBe(0);
    expect(valueAt(dark, cell(900, 600))).toBe(0);
  });

  test("the key ramps monotonically across lighter ± soft", () => {
    const cumulus = OCCLUDERS.find((occluder) => occluder.name === "cumulus");
    if (!cumulus) throw new Error("Missing cumulus occluder");
    const { lighter, soft } = cumulus;
    let previous = -1;
    for (let grey = lighter - soft - 4; grey <= lighter + soft + 4; grey++) {
      const value = valueAt(occluderMask(raster(() => grey)), cell(400, 800));
      expect(value).toBeGreaterThanOrEqual(previous);
      if (grey <= lighter - soft) expect(value).toBe(0);
      if (grey >= lighter + soft) expect(value).toBe(255);
      previous = value;
    }
  });

  test("the floor under the bird is never masked", () => {
    const floor = occluderMask(raster(() => 106));
    for (let x = 560; x < 1160; x += 10)
      for (let y = 720; y < 840; y += 10)
        expect(valueAt(floor, cell(x, y))).toBe(0);
  });

  test("rejects a raster whose bytes do not match its size", () => {
    expect(() =>
      occluderMask({
        data: new Uint8ClampedArray(16),
        width: 600,
        height: 437,
      }),
    ).toThrow(RangeError);
  });
});

describe("haze", () => {
  test("samples 8x8-cell averages bilinearly in painting px", () => {
    // Cells in block column 0 are 0, column 1 averages 160, and the rest 255.
    const haze = Haze.fromSample(
      raster((x) => (x < 8 ? 0 : x < 16 ? (x % 2 ? 200 : 120) : 255)),
    );
    const tone = new Float32Array(3);
    const red = (x: number) => valueAt(haze.tone(x, 200, 0, tone), 0) / NEAR[0];
    expect(red(8)).toBeCloseTo(0, 6);
    expect(red(24)).toBeCloseTo(160 / 255, 6);
    expect(red(16)).toBeCloseTo(80 / 255, 6);
    expect(red(-50)).toBeCloseTo(0, 6);
    expect(red(2000)).toBeCloseTo(1, 6);
  });

  test("whales lighten monotonically from near to far air", () => {
    const haze = Haze.flat(0.5, 0.5, 0.5);
    const tone = new Float32Array(3);
    for (let c = 0; c < 3; c++) {
      let previous = -Infinity;
      for (let amount = 0; amount <= 1; amount += 0.125) {
        const value = valueAt(haze.tone(300, 300, amount, tone), c);
        expect(value).toBeGreaterThan(previous);
        previous = value;
      }
      expect(valueAt(haze.tone(0, 0, 0, tone), c)).toBeCloseTo(
        0.5 * valueAt(NEAR, c),
        6,
      );
      expect(valueAt(haze.tone(0, 0, 1, tone), c)).toBeCloseTo(
        0.5 * valueAt(FAR, c),
        6,
      );
    }
  });

  test("a flat haze is the same everywhere", () => {
    const haze = Haze.flat(0.2, 0.4, 0.6);
    const a = [...haze.tone(10, 10, 0.3, new Float32Array(3))],
      b = [...haze.tone(1100, 800, 0.3, new Float32Array(3))];
    expect(a).toEqual(b);
  });
});
