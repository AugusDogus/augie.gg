"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { rovingTarget } from "~/components/work/roving";
import { closeProject, openProject, usePeek } from "~/lib/peek";

/** What a project's button needs to open the peek and join the list's roving focus. */
export type RowProps = {
  ref: (element: HTMLButtonElement | null) => () => void;
  type: "button";
  "data-project": string;
  tabIndex: 0 | -1;
  "aria-haspopup": "dialog";
  "aria-expanded": boolean;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onClick: () => void;
};

/**
 * The work list's keyboard model, as in WorkList: one tab stop, arrows and
 * j/k move it, and with the peek open it follows focus like a mail client.
 */
export function useRows(order: readonly string[]) {
  const peek = usePeek();
  const [focused, setFocused] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const tabStop =
    focused !== null && order.includes(focused) ? focused : order[0];

  function rowProps(title: string): RowProps {
    const open = peek === title;
    return {
      ref: (element) => {
        if (element) rows.current.set(title, element);
        return () => {
          rows.current.delete(title);
        };
      },
      type: "button",
      "data-project": title,
      tabIndex: tabStop === title ? 0 : -1,
      "aria-haspopup": "dialog",
      "aria-expanded": open,
      onFocus: () => setFocused(title),
      onKeyDown: (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        const target = rovingTarget(order, title, event.key);
        if (target === null) return;
        event.preventDefault();
        rows.current.get(target)?.focus();
        if (peek !== null) openProject(target);
      },
      onClick: () => {
        if (open) closeProject();
        else openProject(title);
      },
    };
  }

  return { peek, rowProps };
}
