import { expect, test } from "bun:test";
import { posterKey } from "./poster";

test("the inline poster was captured from the current t=0 inputs", async () => {
  const css = await Bun.file(
    new URL("../../styles/flight-poster.css", import.meta.url),
  ).text();
  const recorded = css.match(/poster-key: ([0-9a-f]+)/)?.[1];
  if (recorded !== posterKey())
    throw new Error(
      `The t=0 render inputs changed (poster ${recorded ?? "missing"}, renderer ${posterKey()}). Recapture the poster as the README's "Poster" section describes; the current poster still shows the old frame.`,
    );
  expect(recorded).toBe(posterKey());
});

test("the poster key is deterministic", () => {
  expect(posterKey()).toBe(posterKey());
});
