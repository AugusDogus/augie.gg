import { ditherChannel } from "./texture";
import type { WhalePoint } from "./whales";

/** Rasterize cool whale marks on the same two-pixel grid as the artwork filter. */
export function renderWhaleFilter(
  context: CanvasRenderingContext2D,
  points: readonly WhalePoint[],
) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  const cells = new Map<number, number>();
  for (const point of points) {
    if (point.x < 0 || point.x >= 1200 || point.y < 0 || point.y >= 874)
      continue;
    const key = Math.floor(point.y / 2) * 600 + Math.floor(point.x / 2);
    const energy =
      (point.edge ? 0.85 : 0.4 + point.pattern * 0.6) *
      (0.7 + point.depth * 0.3);
    cells.set(key, Math.max(cells.get(key) ?? 0, energy));
  }
  context.save();
  for (const [key, energy] of cells) {
    const x = key % 600,
      y = Math.floor(key / 600);
    const color = [190, 230, 247].map((c) =>
      ditherChannel(c * (0.65 + energy * 0.35), x, y),
    );
    context.fillStyle = `rgb(${color.join(",")})`;
    context.globalAlpha = 0.35 + energy * 0.55;
    context.fillRect(x * 2, y * 2, 2, 2);
  }
  context.restore();
}
