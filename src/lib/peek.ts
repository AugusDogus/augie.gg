"use client";

import { useSyncExternalStore } from "react";
import { projects } from "~/content/projects";

/** The project open in the peek sheet, by title; shared by the work list, the command menu, and the hero. */
let current: string | null = null;
const listeners = new Set<() => void>();
const PARAM = "p";

function emit() {
  for (const listener of listeners) listener();
}

/** Mirrors the open project into `?p=` without adding history entries. */
function writeUrl(title: string | null) {
  const url = new URL(window.location.href);
  if (title === null) url.searchParams.delete(PARAM);
  else url.searchParams.set(PARAM, title);
  window.history.replaceState(null, "", url);
}

/** A link with `?p=<title>` opens that project as the page mounts. */
function restore() {
  const title = new URLSearchParams(window.location.search).get(PARAM);
  if (title === null) return;
  if (projects.some((project) => project.title === title)) current = title;
  else writeUrl(null);
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
    if (listeners.size === 0) current = null;
  };
}

export function usePeek() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
