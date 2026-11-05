"use client";

import { useSyncExternalStore } from "react";

const APPLE = /Mac|iPhone|iPad|iPod/;
const subscribe = () => () => {};

/** Whether the shortcut modifier is ⌘; null while hydrating, before it is known. */
export function useApple(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => APPLE.test(navigator.userAgent),
    () => null,
  );
}

/** Whether the platform's shortcut modifier is held: ⌘ on Apple platforms, Ctrl elsewhere. */
export function withModifier(event: { metaKey: boolean; ctrlKey: boolean }) {
  return APPLE.test(navigator.userAgent) ? event.metaKey : event.ctrlKey;
}
