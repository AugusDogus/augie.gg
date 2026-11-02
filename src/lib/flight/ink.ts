import { smoothstep } from "./streams";
import { bayerIndex, clamp } from "./texture";

type Rgb = readonly [number, number, number];
/** Print level 0..3 per channel. */
export type Level3 = readonly [number, number, number];

/**
 * Adaptive ink, shared with the composite. Over tone whose luma is inside `band`,
 * a growing share of cells sinks instead of lightening, choosing by the Bayer rank
 * at cell + `rank` so the choice does not follow the colour lattice. `face` and
 * `shade` are the continuous colours of lightened and sunk ink.
 */
export const INK: {
  face: Rgb;
  shade: Rgb;
  band: readonly [number, number];
  rank: readonly [number, number];
} = {
  face: [0.875, 0.953, 0.941],
  shade: [0.4, 0.66, 0.74],
  band: [0.62, 0.8],
  rank: [2, 1],
};
const LUMA: Rgb = [0.2126, 0.7152, 0.0722];

/** TS mirror of the composite's ink rule for cell (x, y): lighten by `steps`, or sink a face to R-1 and a fold to R-2, G-1, B-1. */
export function printCell(
  base: Level3,
  steps: 0 | 1 | 2,
  tone: Rgb,
  x: number,
  y: number,
): Level3 {
  const luma = tone[0] * LUMA[0] + tone[1] * LUMA[1] + tone[2] * LUMA[2];
  const threshold = (bayerIndex(x + INK.rank[0], y + INK.rank[1]) + 0.5) / 16;
  if (smoothstep(INK.band[0], INK.band[1], luma) < threshold)
    return [
      clamp(base[0] + steps, 0, 3),
      clamp(base[1] + steps, 0, 3),
      clamp(base[2] + steps, 0, 3),
    ];
  const tint = Math.max(steps - 1, 0);
  return [
    clamp(base[0] - steps, 0, 3),
    clamp(base[1] - tint, 0, 3),
    clamp(base[2] - tint, 0, 3),
  ];
}
