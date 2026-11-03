import type { KeyboardEvent } from "react";

const TABBABLE =
  'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Focusable on the page right now: attached, not the body, not folded away. */
function onPage(element: Element | null): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    element.isConnected &&
    element !== document.body &&
    element.closest("[inert]") === null
  );
}

function rowOf(title: string): HTMLElement | null {
  const row = document.querySelector(`[data-project="${CSS.escape(title)}"]`);
  return onPage(row) ? row : null;
}

/** The control that reveals a row folded into the archive, else the page itself. */
function fallbackFor(title: string): HTMLElement | null {
  const folded =
    document.querySelector(`[data-project="${CSS.escape(title)}"]`) !== null;
  const element = folded
    ? document.querySelector('[aria-controls="archive"]')
    : document.getElementById("main");
  return onPage(element) ? element : null;
}

/** The page's next tab stop after the row, past the peek portaled at the end of the body. */
function tabStopAfter(
  row: HTMLElement,
  panel: HTMLElement,
): HTMLElement | null {
  for (const candidate of document.querySelectorAll(TABBABLE)) {
    const position = row.compareDocumentPosition(candidate);
    if (
      (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
      onPage(candidate) &&
      candidate.tabIndex >= 0 &&
      !panel.contains(candidate) &&
      candidate.checkVisibility()
    )
      return candidate;
  }
  return null;
}

/** Where focus goes around the peek, which lives in a portal outside the page's tab order. */
export const PeekFocus = {
  /**
   * On close: back to the opener, unless focus is already on the page. A row
   * opener gives way to the row of the project last shown, since stepping moves
   * on; so does a lost one, as in Safari, where clicked buttons never take focus.
   * The side peek kept its row in view while stepping, so a page the reader has
   * since scrolled stays put. The modal sheet stepped without moving the list,
   * so a keyboard close brings the ringed row back; a tap leaves the page alone.
   */
  restore(opener: Element | null, title: string, layout: "side" | "sheet") {
    if (onPage(document.activeElement)) return;
    const fromRow =
      opener instanceof Element && opener.closest("[data-project]") !== null;
    if (!fromRow && onPage(opener)) {
      opener.focus({ preventScroll: true });
      return;
    }
    const row = rowOf(title);
    if (row === null) {
      fallbackFor(title)?.focus({ preventScroll: true });
      return;
    }
    row.focus({ preventScroll: true });
    if (layout === "sheet" && row.matches(":focus-visible"))
      row.scrollIntoView({ block: "nearest" });
  },
  /**
   * Tab past either end of the side peek: on as if it sat right after the open
   * project's row, back to the row or to the page past it (else the opener),
   * instead of looping, since the page stays live beside it.
   */
  leave(
    event: KeyboardEvent<HTMLElement>,
    opener: Element | null,
    title: string,
  ) {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const panel = event.currentTarget;
    const tabbable = [...panel.querySelectorAll(TABBABLE)];
    const focused = document.activeElement;
    const atEdge = event.shiftKey
      ? focused === panel || focused === tabbable[0]
      : focused === tabbable.at(-1);
    if (!atEdge) return;
    const row = rowOf(title);
    const target =
      row === null
        ? onPage(opener)
          ? opener
          : fallbackFor(title)
        : event.shiftKey
          ? row
          : (tabStopAfter(row, panel) ?? row);
    if (target === null) return;
    // Ahead of the dialog's own focus loop, which runs even when it is non-modal.
    event.preventDefault();
    event.stopPropagation();
    target.focus();
  },
  /** Tab from the open project's row: into the side peek, mirroring leave(). */
  enter(
    event: globalThis.KeyboardEvent,
    panel: HTMLElement | null,
    title: string,
  ) {
    if (
      event.key !== "Tab" ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (panel === null || document.activeElement !== rowOf(title)) return;
    const first = panel.querySelector<HTMLElement>(TABBABLE);
    if (first === null) return;
    event.preventDefault();
    first.focus();
  },
  /** After the side peek steps: the new project's row comes into view, taking focus from the old row. */
  follow(from: string, to: string) {
    const row = rowOf(to);
    if (row === null) return;
    const old = rowOf(from);
    if (old !== null && document.activeElement === old)
      row.focus({ preventScroll: true });
    row.scrollIntoView({ block: "nearest" });
  },
} as const;
