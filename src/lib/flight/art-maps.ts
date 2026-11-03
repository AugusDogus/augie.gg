import { rasterAt, valueAt } from "./route";
import { smoothstep } from "./streams";
import { ART_WIDTH } from "./viewport";

/** ImageData-compatible RGBA bytes. */
export type Raster = { data: Uint8ClampedArray; width: number; height: number };
/** Painted subjects in front of the air, keyed by luminance inside a painting-space box. */
export type Occluder = {
  name: string;
  /** Mask channel, in LAYERS order. */
  layer: "near" | "wing" | "puffs";
  box: readonly [x0: number, y0: number, x1: number, y1: number];
  lighter: number;
  soft: number;
};
const LAYERS = ["near", "wing", "puffs"] as const;

export const OCCLUDERS: readonly Occluder[] = [
  {
    name: "cumulus",
    layer: "near",
    box: [180, 640, 560, 874],
    lighter: 135,
    soft: 12,
  },
  {
    name: "bird",
    layer: "near",
    box: [690, 450, 1136, 726],
    lighter: 130,
    soft: 10,
  },
  {
    name: "wing",
    layer: "wing",
    box: [760, 450, 930, 640],
    lighter: 205,
    soft: 12,
  },
  {
    name: "puffs",
    layer: "puffs",
    box: [330, 470, 560, 560],
    lighter: 190,
    soft: 12,
  },
];
/** Whale tints for near and far air, and the sunlit dorsal rim. Tuned visually. */
export const NEAR: readonly [number, number, number] = [0.32, 0.68, 0.82];
export const FAR: readonly [number, number, number] = [0.8, 0.9, 0.94];
export const RIM = 0.1;
/** Sample cells averaged into one haze cell. */
const HAZE_BLOCK = 8;

export function checked(raster: Raster) {
  if (raster.data.length !== raster.width * raster.height * 4)
    throw new RangeError(
      `Expected ${raster.width}x${raster.height} RGBA bytes, got ${raster.data.length}`,
    );
  return raster;
}
export const luminance = (data: Uint8ClampedArray, pixel: number) =>
  0.2126 * rasterAt(data, pixel * 4) +
  0.7152 * rasterAt(data, pixel * 4 + 1) +
  0.0722 * rasterAt(data, pixel * 4 + 2);

/**
 * 600x437x3 bytes, row 0 at the painting top; 255 where paint covers new elements.
 * R = near (cumulus + bird), G = raised wing, B = puffs.
 */
export function occluderMask(sample: Raster): Uint8Array {
  const { data, width, height } = checked(sample);
  const cell = ART_WIDTH / width;
  const mask = new Uint8Array(width * height * 3);
  for (const { layer, box, lighter, soft } of OCCLUDERS) {
    const channel = LAYERS.indexOf(layer);
    const [x0, y0, x1, y1] = box;
    const left = Math.max(0, Math.ceil(x0 / cell - 0.5)),
      right = Math.min(width, Math.ceil(x1 / cell - 0.5)),
      top = Math.max(0, Math.ceil(y0 / cell - 0.5)),
      bottom = Math.min(height, Math.ceil(y1 / cell - 0.5));
    for (let y = top; y < bottom; y++)
      for (let x = left; x < right; x++) {
        const pixel = y * width + x;
        const key = Math.round(
          255 *
            smoothstep(lighter - soft, lighter + soft, luminance(data, pixel)),
        );
        const index = pixel * 3 + channel;
        mask[index] = Math.max(rasterAt(mask, index), key);
      }
  }
  return mask;
}

/** Local air colour on a coarse bilinear grid, used to tint whales by aerial perspective. */
export class Haze {
  private constructor(
    private readonly colors: Float32Array,
    private readonly columns: number,
    private readonly rows: number,
    /** Painting px per grid cell. */
    private readonly size: number,
  ) {}

  static fromSample(sample: Raster): Haze {
    const { data, width, height } = checked(sample);
    const columns = Math.ceil(width / HAZE_BLOCK),
      rows = Math.ceil(height / HAZE_BLOCK);
    const sums = new Float64Array(columns * rows * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const block =
          (Math.floor(y / HAZE_BLOCK) * columns + Math.floor(x / HAZE_BLOCK)) *
          4;
        for (let c = 0; c < 3; c++)
          sums[block + c] =
            rasterAt(sums, block + c) + rasterAt(data, (y * width + x) * 4 + c);
        sums[block + 3] = rasterAt(sums, block + 3) + 1;
      }
    const colors = new Float32Array(columns * rows * 3);
    for (let i = 0; i < columns * rows; i++)
      for (let c = 0; c < 3; c++)
        colors[i * 3 + c] =
          rasterAt(sums, i * 4 + c) / rasterAt(sums, i * 4 + 3) / 255;
    return new Haze(colors, columns, rows, (ART_WIDTH / width) * HAZE_BLOCK);
  }

  static flat(r: number, g: number, b: number): Haze {
    return new Haze(Float32Array.of(r, g, b), 1, 1, ART_WIDTH);
  }

  /** Local air colour at painting px (x, y), tinted from NEAR (0) to FAR (1). Linear 0..1 RGB. */
  tone(x: number, y: number, amount: number, out: Float32Array) {
    const gx = Math.max(0, Math.min(this.columns - 1, x / this.size - 0.5)),
      gy = Math.max(0, Math.min(this.rows - 1, y / this.size - 0.5));
    const left = Math.floor(gx),
      top = Math.floor(gy);
    const right = Math.min(this.columns - 1, left + 1),
      bottom = Math.min(this.rows - 1, top + 1);
    const u = gx - left,
      v = gy - top;
    for (let c = 0; c < 3; c++) {
      const color =
        (this.at(left, top, c) * (1 - u) + this.at(right, top, c) * u) *
          (1 - v) +
        (this.at(left, bottom, c) * (1 - u) + this.at(right, bottom, c) * u) *
          v;
      const near = valueAt(NEAR, c);
      out[c] = color * (near + (valueAt(FAR, c) - near) * amount);
    }
    return out;
  }

  private at(column: number, row: number, c: number) {
    return valueAt(this.colors, (row * this.columns + column) * 3 + c);
  }
}
