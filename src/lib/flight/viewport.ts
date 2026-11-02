export const ART_WIDTH = 1200,
  ART_HEIGHT = 874,
  PAINT_ZOOM = 0.94;

/** The art is scaled to cover the height (or width) and pinned to the right edge. */
export type ArtFit = { scale: number; x: number; wide: boolean };

export function fitArt(width: number, height: number): ArtFit | null {
  const scale = Math.min(width / ART_WIDTH, height / ART_HEIGHT);
  if (!(scale > 0)) return null;
  return {
    scale,
    x: width - ART_WIDTH * scale,
    wide: width / height > ART_WIDTH / ART_HEIGHT,
  };
}

/** Client coordinates to 0..1 display-art units. A zero-size rect maps outside the art. */
export function pointerToArt(
  rect: Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">,
  clientX: number,
  clientY: number,
) {
  const fit = fitArt(rect.width, rect.height);
  if (!fit) return { x: -1, y: -1 };
  return {
    x: (clientX - rect.left - fit.x) / (ART_WIDTH * fit.scale),
    y: (clientY - rect.top) / (ART_HEIGHT * fit.scale),
  };
}

/** Display-art units to painting px. The composite zooms the painting about its centre. */
export function toPainting(x01: number, y01: number) {
  return {
    x: ART_WIDTH / 2 + (x01 * ART_WIDTH - ART_WIDTH / 2) * PAINT_ZOOM,
    y: ART_HEIGHT / 2 + (y01 * ART_HEIGHT - ART_HEIGHT / 2) * PAINT_ZOOM,
  };
}
