"use client";

import { useSyncExternalStore } from "react";
import { projects } from "~/content/projects";
import { DEFAULT_APP_TITLE } from "~/lib/site";

/** The open project, by title, pinned on the stage or shown in the sheet; shared by the work list and the command menu. */
let current: string | null = null;
const listeners = new Set<() => void>();
const PARAM = "p";

function emit() {
  for (const listener of listeners) listener();
}

let titleWatch: MutationObserver | undefined;

/**
 * Names the open project in the tab. The page's streamed metadata can mount
 * after a deep link or an early click and reset the title, so it is held
 * while `?p=` still names that project.
 */
function writeTitle(title: string | null) {
  titleWatch?.disconnect();
  if (title === null) {
    document.title = DEFAULT_APP_TITLE;
    return;
  }
  document.title = `${title} | ${DEFAULT_APP_TITLE}`;
  const held = document.title;
  titleWatch = new MutationObserver(() => {
    const linked = new URLSearchParams(window.location.search).get(PARAM);
    if (linked === title && document.title !== held) document.title = held;
  });
  titleWatch.observe(document.head, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

/** Mirrors the open project into `?p=` and the tab title, without adding history entries. */
function writeUrl(title: string | null) {
  const url = new URL(window.location.href);
  if (title === null) url.searchParams.delete(PARAM);
  else url.searchParams.set(PARAM, title);
  window.history.replaceState(null, "", url);
  writeTitle(title);
}

/** A link with `?p=<title>` opens that project as the page mounts. */
function restore() {
  const title = new URLSearchParams(window.location.search).get(PARAM);
  if (title === null) return;
  if (projects.some((project) => project.title === title)) {
    current = title;
    writeTitle(title);
  } else writeUrl(null);
}

export function openProject(title: string) {
  current = title;
  writeUrl(title);
  emit();
}

export function closeProject() {
  current = null;
  writeUrl(null);
  emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) restore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // Leaving home drops `?p=`; a return starts from the URL, not stale state.
    if (listeners.size === 0) {
      current = null;
      titleWatch?.disconnect();
    }
  };
}

export function usePeek() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
