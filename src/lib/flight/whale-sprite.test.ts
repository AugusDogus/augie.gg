import { describe, expect, test } from "bun:test";
import { WhaleSprite } from "./whale-sprite";

const sprite = WhaleSprite.render();
const { FRAMES, WIDTH, HEIGHT } = WhaleSprite;

/** One frame's levels, row by row. */
function frame(index: number) {
  const cells = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++)
      cells[y * WIDTH + x] =
        sprite.levels[y * WIDTH * FRAMES + index * WIDTH + x] ?? 0;
  return cells;
}

/** Columns that hold any ink, first and last. */
function span(cells: Uint8Array) {
  let first = WIDTH,
    last = -1;
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i]) continue;
    first = Math.min(first, i % WIDTH);
    last = Math.max(last, i % WIDTH);
  }
  return { first, last };
}

describe("WhaleSprite.render", () => {
  test("is a strip of FRAMES frames of print levels 0..3", () => {
    expect(sprite.levels.length).toBe(WIDTH * FRAMES * HEIGHT);
    expect(Math.max(...sprite.levels)).toBe(3);
    expect(Math.min(...sprite.levels)).toBe(0);
  });

  test("every frame holds both whales, clear of its edges", () => {
    for (let index = 0; index < FRAMES; index++) {
      const cells = frame(index);
      const inked = cells.reduce((sum, level) => sum + (level ? 1 : 0), 0);
      expect(inked).toBeGreaterThan(WIDTH * HEIGHT * 0.08);
      const { first, last } = span(cells);
      expect(first).toBeGreaterThan(0);
      expect(last).toBeLessThan(WIDTH - 1);
      for (let x = 0; x < WIDTH; x++) {
        expect(cells[x]).toBe(0);
        expect(cells[(HEIGHT - 1) * WIDTH + x]).toBe(0);
      }
    }
  });

  test("the tail beats: neighbouring frames differ, and only behind the rigid front", () => {
    const front = Math.round(WIDTH * 0.84);
    for (let index = 0; index < FRAMES; index++) {
      const now = frame(index),
        next = frame((index + 1) % FRAMES);
      let moved = 0;
      for (let i = 0; i < now.length; i++) {
        if (now[i] === next[i]) continue;
        moved++;
        expect(i % WIDTH).toBeLessThan(front);
      }
      expect(moved).toBeGreaterThan(0);
    }
  });

  test("the backs are lit and the bellies dark", () => {
    // The mother's front, clear of the calf: each column's first and last ink.
    const cells = frame(0);
    let backs = 0,
      bellies = 0,
      columns = 0;
    for (let x = Math.round(WIDTH * 0.78); x < Math.round(WIDTH * 0.92); x++) {
      const inked: number[] = [];
      for (let y = 0; y < HEIGHT; y++) {
        const level = cells[y * WIDTH + x] ?? 0;
        if (level) inked.push(level);
      }
      expect(inked.length).toBeGreaterThan(4);
      backs += inked[0] ?? 0;
      bellies += inked.at(-1) ?? 0;
      columns++;
    }
    expect(backs / columns).toBeGreaterThan(2.5);
    expect(bellies / columns).toBeLessThan(1.5);
  });
});

describe("WhaleSprite.pixels", () => {
  test("leaves empty cells clear and inks the rest opaque", () => {
    const pixels = WhaleSprite.pixels(sprite);
    expect(pixels.length).toBe(sprite.levels.length * 4);
    for (let i = 0; i < sprite.levels.length; i += 97)
      expect(pixels[i * 4 + 3]).toBe(sprite.levels[i] ? 255 : 0);
  });
});
