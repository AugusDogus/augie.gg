"use client";

import { useEffect } from "react";
import { GITHUB_URL } from "~/lib/site";

let greeted = false;

/**
 * A note for whoever opens the console: the painting's whales, as text, and
 * where the source is. `art` is drawn on the server, so the page does no work
 * for it, and it prints once per visit, however many pages are opened.
 */
export function ConsoleGreeting({ art }: { art: string }) {
  useEffect(() => {
    if (greeted) return;
    greeted = true;
    console.log(
      `%c${art}\n\n%cHi. If you're reading this, you might like the source:\n${GITHUB_URL}/augie.gg\nThe whales live in src/lib/flight.`,
      "color: #54a0ae; font-family: monospace; line-height: 1",
      "color: inherit; font-family: inherit; line-height: inherit",
    );
  }, [art]);
  return null;
}
