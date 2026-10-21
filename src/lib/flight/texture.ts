/** Approved two-pixel ordered dither, blended with the original artwork. */
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const clamp = (value: number, min = 0, max = 255) =>
  Math.min(max, Math.max(min, value));
export function ditherChannel(value: number, x: number, y: number) {
  const cell = bayer[(y % 4) * 4 + (x % 4)];
  if (cell === undefined)
    throw new RangeError(
      "Dither coordinates must be nonnegative integer cells",
    );
  const threshold = (cell + 0.5) / 16 - 0.5;
  return clamp(Math.round(value / 85 + threshold) * 85);
}
export function contrastChannel(channel: number, contrast: number) {
  return clamp(((channel - 127.5) * contrast) / 100 + 127.5);
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

export function renderTexture(image: HTMLImageElement) {
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
  sampleContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const imageData = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight);
  const pixels = imageData.data;
  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      const index = (y * sampleWidth + x) * 4;
      const r = pixels[index],
        g = pixels[index + 1],
        b = pixels[index + 2];
      if (r === undefined || g === undefined || b === undefined)
        throw new Error("Artwork pixel buffer is incomplete");
      pixels[index] = ditherChannel(contrastChannel(r, 110), x, y);
      pixels[index + 1] = ditherChannel(contrastChannel(g, 110), x, y);
      pixels[index + 2] = ditherChannel(contrastChannel(b, 110), x, y);
    }
  }
  // Expand the dither cells in one draw instead of issuing 262,200 rectangles.
  sampleContext.putImageData(imageData, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(sample, 0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.globalAlpha = 0.15;
  context.drawImage(image, 0, 0, width, height);
  let seed = 1607;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 80000; i++) {
    const x = random() * width,
      y = random() * height;
    context.fillStyle = i % 2 ? "#ffffff" : "#041f29";
    context.globalAlpha = 0.07 + random() * 0.12;
    context.fillRect(x, y, 1, 1);
  }
  context.globalAlpha = 1;
  sample.width = 0;
  return canvas;
}
