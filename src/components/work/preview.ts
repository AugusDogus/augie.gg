"use client";

import { useSyncExternalStore } from "react";
import { Aim, type Edge, type Point } from "./aim";

/** A pointer passing over the list waits this long before the stage first appears. */
const SHOW_MS = 80;
/** The stage stays this long after the pointer leaves, enough to cross onto it. */
const HIDE_MS = 160;
/** Resting this long on another row while heading for the stage means that row. */
const AIM_MS = 120;

type Timer = ReturnType<typeof setTimeout> | undefined;

/** The project previewed on the stage, by title. */
let shown: string | null = null;
/** Where the pointer left the shown row. */
let exit: Point | null = null;
/** Heading for the stage across other rows: the row under the pointer, if any. */
let aim: { row: string | null } | null = null;
let showTimer: Timer;
let hideTimer: Timer;
let aimTimer: Timer;
let stage: () => Edge | null = () => null;
const listeners = new Set<() => void>();

function set(next: string | null) {
  clearTimeout(showTimer);
  if (shown === next) return;
  shown = next;
  for (const listener of listeners) listener();
}

function heading(point: Point): boolean {
  const edge = stage();
  return exit !== null && edge !== null && Aim.toward(exit, edge, point);
}

function stopAiming() {
  aim = null;
  clearTimeout(aimTimer);
  window.removeEventListener("pointermove", onAimMove);
}

/** The pointer stopped heading for the stage: show the row it is on now. */
function settle() {
  const row = aim?.row ?? null;
  stopAiming();
  if (row !== null) set(row);
}

function onAimMove(event: PointerEvent) {
  if (!heading({ x: event.clientX, y: event.clientY })) settle();
  else if (aim !== null && aim.row !== null) {
    clearTimeout(aimTimer);
    aimTimer = setTimeout(settle, AIM_MS);
  }
}

/**
 * Hover intent for the stage, shared by the work list's rows and the stage
 * itself: a short wait before it first appears, none to switch, a beat before
 * it goes, and no switching while the pointer crosses other rows on its way
 * onto the stage.
 */
export const Preview = {
  /** A row the pointer entered (with its position) or keyboard focus reached (null). */
  enter(title: string, point: Point | null) {
    clearTimeout(hideTimer);
    if (shown !== null && shown !== title && point !== null && heading(point)) {
      if (aim === null) {
        aim = { row: null };
        window.addEventListener("pointermove", onAimMove);
      }
      aim.row = title;
      clearTimeout(aimTimer);
      aimTimer = setTimeout(settle, AIM_MS);
      return;
    }
    stopAiming();
    if (shown !== null || point === null) {
      set(title);
      return;
    }
    clearTimeout(showTimer);
    showTimer = setTimeout(() => set(title), SHOW_MS);
  },
  /** The pointer or focus left a row, at this position when it was the pointer. */
  leave(point: Point | null) {
    // A pointer only passing through never shows anything.
    clearTimeout(showTimer);
    if (aim === null) exit = point;
    else aim.row = null;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      stopAiming();
      set(null);
    }, HIDE_MS);
  },
  /** The pointer reached the stage: keep what it shows. */
  hold() {
    clearTimeout(hideTimer);
    stopAiming();
  },
  /** Hide now, as when a project is closed. */
  clear() {
    clearTimeout(hideTimer);
    stopAiming();
    exit = null;
    set(null);
  },
  /** Where the stage is, for telling a pointer heading for it from one moving down the list. */
  target(edge: () => Edge | null) {
    stage = edge;
    return () => {
      stage = () => null;
    };
  },
} as const;

export function usePreview(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => shown,
    () => null,
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
