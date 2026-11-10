/**
 * Prints the whale strip on its own thread and posts it back as a PNG, so a
 * page that is busy loading never stops to draw it. whale-loader.tsx is the
 * other end. Where a worker cannot draw a canvas, it posts null.
 */
import { WhaleSprite } from "./whale-sprite";

async function print(): Promise<Blob | null> {
  if (typeof OffscreenCanvas === "undefined") return null;
  const canvas = new OffscreenCanvas(
    WhaleSprite.WIDTH * WhaleSprite.FRAMES,
    WhaleSprite.HEIGHT,
  );
  const context = canvas.getContext("2d");
  if (context === null) return null;
  const image = context.createImageData(canvas.width, canvas.height);
  image.data.set(WhaleSprite.pixels(WhaleSprite.render()));
  context.putImageData(image, 0, 0);
  return canvas.convertToBlob();
}

void print().then(
  (strip) => postMessage(strip),
  () => postMessage(null),
);
