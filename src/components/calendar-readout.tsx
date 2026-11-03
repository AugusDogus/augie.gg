"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type CalendarDay,
  cellAt,
  contributions,
  dayIndexAt,
  longDay,
  moveForKey,
  moveTo,
  PITCH,
  placeDays,
  shortDay,
  splitAt,
} from "~/lib/contribution-print";
import { cn } from "~/lib/utils";

/** Only keyboard moves speak; hover clears on leave, touch persists until a tap outside. */
type Selection = {
  index: number;
  via: "hover" | "touch" | "focus" | "keyboard";
};

export function CalendarReadout({
  weeks,
  total,
  summaryId,
  halves,
}: {
  weeks: readonly (readonly (CalendarDay | null)[])[];
  total: number;
  summaryId: string;
  /** Each half's SVG and end label, server-rendered; the outline lands beside them. */
  halves: readonly [ReactNode, ReactNode];
}) {
  const days = placeDays(weeks);
  const split = splitAt(weeks.length);
  const [selection, setSelection] = useState<Selection | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const halfElements = useRef<(HTMLDivElement | null)[]>([]);
  const selected = selection === null ? undefined : days[selection.index];
  // The hidden line keeps a day's worth of height so the readout never shifts.
  const shown = selected ?? days.at(-1);

  useEffect(() => {
    // pointerup, not pointerdown: a scroll that starts outside ends in pointercancel.
    const tapOutside = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && grid.current?.contains(event.target))
        return;
      setSelection((current) => (current?.via === "touch" ? null : current));
    };
    document.addEventListener("pointerup", tapOutside);
    return () => document.removeEventListener("pointerup", tapOutside);
  }, []);

  function select(next: Selection | null) {
    setSelection((current) =>
      current?.index === next?.index && current?.via === next?.via
        ? current
        : next,
    );
  }

  function dayAt(clientX: number, clientY: number): number | null {
    for (const [half, element] of halfElements.current.entries()) {
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const cell = cellAt(
        clientX - rect.left,
        clientY - rect.top,
        half === 0 ? split : weeks.length - split,
      );
      if (cell)
        return dayIndexAt(
          days,
          cell.column + (half === 0 ? 0 : split),
          cell.row,
        );
    }
    return null;
  }

  function onPointer(event: PointerEvent<HTMLDivElement>) {
    const index = dayAt(event.clientX, event.clientY);
    // A scrubbing finger keeps its last day when it drifts off the grid.
    if (event.pointerType === "touch") {
      if (index !== null) select({ index, via: "touch" });
    } else select(index === null ? null : { index, via: "hover" });
  }

  function onPointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") select(null);
  }

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    // Pointer focus keeps the pointer's day; only keyboard focus picks the latest.
    if (event.currentTarget.matches(":focus-visible"))
      select({ index: days.length - 1, via: "focus" });
  }

  function onBlur() {
    if (selection?.via === "focus" || selection?.via === "keyboard")
      setSelection(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      select(null);
      return;
    }
    const move = moveForKey(event.key);
    if (move === null) return;
    event.preventDefault();
    select({
      index: moveTo(days, selection?.index ?? null, move),
      via: "keyboard",
    });
  }

  const marker = selected && {
    half: selected.week < split ? 0 : 1,
    left: (selected.week - (selected.week < split ? 0 : split)) * PITCH - 1,
    top: selected.weekday * PITCH - 1,
  };

  return (
    <>
      <figcaption className="mb-2.5 grid text-[14px]/[1.4] text-(--muted) tabular-nums *:[grid-area:1/1]">
        <span className={cn(selected && "invisible")}>
          <strong className="font-semibold text-(--ink)">
            {contributions(total)}
          </strong>{" "}
          on GitHub in the last year
        </span>
        <span className={cn(!selected && "invisible")}>
          {shown && (
            <>
              <strong className="font-semibold text-(--ink)">
                {contributions(shown.count)}
              </strong>{" "}
              on {shortDay(shown.date)}
            </>
          )}
        </span>
      </figcaption>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- role="application": one tab stop that reads days with the arrow keys */}
      <div
        ref={grid}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
        tabIndex={0}
        role="application"
        aria-label="GitHub contribution calendar"
        aria-describedby={summaryId}
        className="halves flex touch-pan-y flex-wrap gap-x-[2px] gap-y-3 outline-offset-4 focus-visible:outline-2 focus-visible:outline-(--ink)"
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      >
        {halves.map((content, half) => (
          <div
            key={half}
            ref={(element) => {
              halfElements.current[half] = element;
            }}
            className={cn("half relative", half === 1 && "b")}
          >
            {content}
            {marker?.half === half && (
              <span
                className="mark pointer-events-none absolute size-2.5 border border-(--ink)"
                style={{ left: marker.left, top: marker.top }}
              />
            )}
          </div>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {selection?.via === "keyboard" && selected
          ? `${contributions(selected.count)} on ${longDay(selected.date)}`
          : ""}
      </span>
    </>
  );
}
