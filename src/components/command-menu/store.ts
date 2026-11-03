"use client";

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

/** Whether the command menu is open; shared by the header trigger, the shortcuts, and the menu. */
let open = false;
/** Where focus goes back to on close; null after a handoff to another surface. */
let opener: HTMLElement | null = null;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (open === next) return;
  open = next;
  for (const listener of listeners) listener();
}

export function openMenu(from: Element | null = document.activeElement) {
  if (open) return;
  opener = from instanceof HTMLElement && from !== document.body ? from : null;
  set(true);
}

export function closeMenu() {
  set(false);
}

export function toggleMenu() {
  if (open) closeMenu();
  else openMenu();
}

/**
 * Closes the menu for another dialog, such as the project peek, and puts focus
 * back on the opener first so that dialog returns focus there when it closes.
 */
export function handOffMenu() {
  flushSync(closeMenu);
  if (opener) opener.focus({ preventScroll: true });
  else if (document.activeElement instanceof HTMLElement)
    document.activeElement.blur();
  opener = null;
}

/** Returns focus to whatever opened the menu, once the menu has closed. */
export function restoreFocus() {
  opener?.focus({ preventScroll: true });
  opener = null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMenuOpen() {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}
