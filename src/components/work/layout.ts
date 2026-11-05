"use client";

import { useSyncExternalStore } from "react";

/**
 * Wide side layouts, with the painting beside the list, and a pointer that can
 * hover: projects open on the stage. Everywhere else they open in the bottom
 * sheet. The CSS twin is the `stage:` variant in globals.css.
 */
const STAGE_QUERY =
  "(width > 1000px) and (aspect-ratio > 5/4) and (hover: hover) and (pointer: fine)";

function subscribe(listener: () => void) {
  const media = matchMedia(STAGE_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function useStageLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(STAGE_QUERY).matches,
    () => false,
  );
}
