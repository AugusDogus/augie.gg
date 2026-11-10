import { describe, expect, test } from "bun:test";
import { WhaleArt } from "./whale-art";

describe("WhaleArt.lines", () => {
  const lines = WhaleArt.lines();

  test("fits a terminal and wastes no rows or columns", () => {
    expect(lines.length).toBeGreaterThan(10);
    expect(lines.length).toBeLessThan(30);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(80);
      expect(line).toBe(line.trimEnd());
    }
    expect(lines[0]?.trim()).not.toBe("");
    expect(lines.at(-1)?.trim()).not.toBe("");
    expect(lines.some((line) => !line.startsWith(" "))).toBe(true);
  });

  test("is drawn in three shades, lit backs over dark bellies", () => {
    const text = lines.join("\n");
    expect(text).toMatch(/^[ ░▒▓\n]+$/);
    for (const shade of ["░", "▒", "▓"]) expect(text).toContain(shade);
    // The mother's back is the first ink from the top; her fin, the last of hers, is dark.
    expect(lines[0]?.trim()).toMatch(/^▓+$/);
  });
});
