import { valueAt } from "./route";

/** Approved two-pixel ordered dither, blended with the original artwork. */
export const clamp = (value: number, min = 0, max = 255) =>
  Math.min(max, Math.max(min, value));
const rank2 = (x: number, y: number) => 2 * x + 3 * y - 4 * x * y;
/** The 4x4 Bayer rank of a cell, in the closed form the shaders mirror. */
export function bayerIndex(x: number, y: number) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0)
    throw new RangeError(
      "Dither coordinates must be nonnegative integer cells",
    );
  return (
    4 * rank2(x % 2, y % 2) +
    rank2(Math.floor(x / 2) % 2, Math.floor(y / 2) % 2)
  );
}
export function ditherChannel(value: number, x: number, y: number) {
  const threshold = (bayerIndex(x, y) + 0.5) / 16 - 0.5;
  return clamp(Math.round(value / 85 + threshold) * 85);
}
export function contrastChannel(channel: number, contrast: number) {
  return clamp(((channel - 127.5) * contrast) / 100 + 127.5);
}
/**
 * ditherChannel(contrastChannel(v, contrast), x, y) for every byte v, at
 * ((y % 4) * 4 + x % 4) * 256 + v: the rank repeats every four cells.
 */
export function printLevels(contrast: number) {
  const levels = new Uint8Array(16 * 256);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++)
      for (let v = 0; v < 256; v++)
        levels[(y * 4 + x) * 256 + v] = ditherChannel(
          contrastChannel(v, contrast),
          x,
          y,
        );
  return levels;
}
/** Mirror of the composite's lattice(): print level 0..3 of a 0..1 channel at Bayer rank threshold t = (rank + .5) / 16, contrast 110. */
export function latticeLevel(v01: number, t: number) {
  return clamp(Math.floor(clamp((v01 - 0.5) * 1.1 + 0.5, 0, 1) * 3 + t), 0, 3);
}

/** Deterministic 0..1 hash of an integer. */
export function hash(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function canvas2d(width: number, height: number, readOften = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: readOften });
  if (!context)
    throw new Error("The artwork renderer could not create a 2D canvas");
  return { canvas, context };
}

/** The seeded LCG behind the print grain, shared so other layers stay reproducible. */
export function random(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * The decoded painting. `bitmap` holds CPU pixels for the sample and the GPU
 * upload, so neither decodes the JPEG again on the main thread. The print's
 * full-size blend still draws `image`: an accelerated canvas decodes an <img>
 * its own way, a level off the bitmap in places, and the approved print and
 * its poster come from that path.
 */
export type Artwork = { image: HTMLImageElement; bitmap: ImageBitmap };

export async function loadArtwork(src: string): Promise<Artwork> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return { image, bitmap: await createImageBitmap(image) };
}

export type PrintedArt = {
  /** The 1200x874 print. */
  canvas: HTMLCanvasElement;
  /** The 600x437 dithered lattice drawn into the print. */
  cells: ImageData;
  /** The 600x437 downsample before contrast and dither. */
  sample: ImageData;
};

export function renderTexture({ image, bitmap }: Artwork): PrintedArt {
  const width = 1200,
    height = 874,
    sampleWidth = 600,
    sampleHeight = 437;
  const { canvas, context } = canvas2d(width, height);
  const { canvas: sample, context: sampleContext } = canvas2d(
    sampleWidth,
    sampleHeight,
    true,
  );
  sampleContext.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
  const original = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight);
  const imageData = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight);
  const pixels = imageData.data;
  const levels = printLevels(110);
  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      const index = (y * sampleWidth + x) * 4,
        tile = ((y % 4) * 4 + (x % 4)) * 256;
      const r = pixels[index],
        g = pixels[index + 1],
        b = pixels[index + 2];
      if (r === undefined || g === undefined || b === undefined)
        throw new Error("Artwork pixel buffer is incomplete");
      pixels[index] = valueAt(levels, tile + r);
      pixels[index + 1] = valueAt(levels, tile + g);
      pixels[index + 2] = valueAt(levels, tile + b);
    }
  }
  // Expand the dither cells in one draw instead of issuing 262,200 rectangles.
  sampleContext.putImageData(imageData, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(sample, 0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.globalAlpha = 0.15;
  context.drawImage(image, 0, 0, width, height);
  const grain = random(1607);
  for (let i = 0; i < 80000; i++) {
    const x = grain() * width,
      y = grain() * height;
    context.fillStyle = i % 2 ? "#ffffff" : "#041f29";
    context.globalAlpha = 0.07 + grain() * 0.12;
    context.fillRect(x, y, 1, 1);
  }
  context.globalAlpha = 1;
  sample.width = 0;
  return { canvas, cells: imageData, sample: original };
}
