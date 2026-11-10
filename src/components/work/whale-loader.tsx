"use client";

import { type CSSProperties, useEffect } from "react";
import { usePlaying } from "~/components/flight-background";
import { WhaleSprite } from "~/lib/flight/whale-sprite";

/** One loop is one of the mother's strokes, at her pace in the painting. */
const STROKE_MS = 3400;

/** A loader shows nothing for this long, so a prompt still never flashes it; the stylesheet's delay matches. */
const PROMPT_MS = 150;

/** The strip's measures in cells, for the stylesheet, which sizes a cell. */
const POD: CSSProperties & Record<`--whale-${string}`, string | number> = {
  "--whale-cols": WhaleSprite.WIDTH,
  "--whale-rows": WhaleSprite.HEIGHT,
  "--whale-frames": WhaleSprite.FRAMES,
  "--whale-stroke": `${STROKE_MS}ms`,
};

let printed = false;

/**
 * Has the strip printed once, for every loader on the page, and hands it to
 * the stylesheet. A worker prints it (lib/flight/whale-sprite.worker.ts), so
 * the page never stops for it. Until it lands, and in a browser whose workers
 * cannot draw a canvas, loaders show only their drifting specks.
 */
function print() {
  if (printed) return;
  printed = true;
  const worker = new Worker(
    new URL("../../lib/flight/whale-sprite.worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (event: MessageEvent<unknown>) => {
    if (event.data instanceof Blob)
      document.documentElement.style.setProperty(
        "--whale-strip",
        `url(${URL.createObjectURL(event.data)})`,
      );
    worker.terminate();
  };
  worker.onerror = () => worker.terminate();
}

/**
 * What a capture's frame shows while its pixels are on the way: the
 * painting's mother and calf swimming in place as specks drift past. It
 * fills its nearest positioned ancestor, which must be a size container, and
 * follows the painting's pause. Everything moves by CSS transforms, so it
 * keeps time while the page is busy loading.
 */
export function WhaleLoader() {
  const { playing } = usePlaying();
  // Printed only once a loader is about to show: most stills arrive first.
  useEffect(() => {
    const timer = setTimeout(print, PROMPT_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <span className="whale-loader" data-playing={playing} aria-hidden="true">
      <span className="whale-loader-specks" />
      <span className="whale-loader-pod" style={POD}>
        <span className="whale-loader-strip" />
      </span>
    </span>
  );
}
