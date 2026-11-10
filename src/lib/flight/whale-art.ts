import { WhaleSprite } from "./whale-sprite";

/** A character per print level: empty, belly, flank, lit back. */
const SHADES = [" ", "░", "▒", "▓"] as const;

/**
 * The whale strip's first frame as text, for places that can only print
 * characters. A character is about twice as tall as it is wide, so each
 * takes one cell across and two down, showing the lighter of the two.
 */
function lines(): string[] {
  const { levels } = WhaleSprite.render();
  const { WIDTH, HEIGHT, FRAMES } = WhaleSprite;
  const rows: string[] = [];
  for (let y = 0; y + 1 < HEIGHT; y += 2) {
    let row = "";
    for (let x = 0; x < WIDTH; x++) {
      const upper = levels[y * WIDTH * FRAMES + x] ?? 0,
        lower = levels[(y + 1) * WIDTH * FRAMES + x] ?? 0;
      row += SHADES[Math.max(upper, lower)] ?? " ";
    }
    rows.push(row.trimEnd());
  }
  // Trimmed to the whales: no empty rows above or below, no shared margin.
  const inked = rows.map((row) => row !== "");
  const kept = rows.slice(inked.indexOf(true), inked.lastIndexOf(true) + 1);
  const margin = Math.min(
    ...kept.filter(Boolean).map((row) => row.length - row.trimStart().length),
  );
  return kept.map((row) => row.slice(margin));
}

export const WhaleArt = { lines } as const;
