"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  CELL,
  cellAt,
  cellFill,
  contributions,
  dayIndexAt,
  GRID_HEIGHT,
  GRID_TOP,
  gridWidth,
  longDate,
  monthLabels,
  moveForKey,
  moveTo,
  PITCH,
  placeDays,
  tooltipDate,
  type Week,
} from "~/lib/activity";
import { cn } from "~/lib/utils";

/** Only keyboard moves speak; hover clears on leave, touch on a tap elsewhere. */
type Selection = {
  index: number;
  via: "hover" | "touch" | "focus" | "keyboard";
};

/** Which sides of the scroller hide weeks, for its edge fade. */
type Fade = "none" | "left" | "right" | "both";

function hiddenEdges(scroller: HTMLElement | null): Fade {
  const content = scroller?.firstElementChild;
  if (!scroller || !content) return "none";
  const outer = scroller.getBoundingClientRect();
  const inner = content.getBoundingClientRect();
  const left = inner.left < outer.left - 1,
    right = inner.right > outer.right + 1;
  return left && right ? "both" : left ? "left" : right ? "right" : "none";
}

/** A tooltip reopened this soon after closing skips its delay. */
const WARM_MS = 400;
/** Total stagger of the reveal across all weeks; each week then fades for 200ms. */
const REVEAL_SPREAD_MS = 300;
/** Below sm the graph scrolls anyway, so cells grow for fingers (8px to 10px). */
const PHONE_SCALE = 1.25;

export function ActivityGraph({
  weeks,
  describedBy,
}: {
  weeks: readonly Week[];
  describedBy: string;
}) {
  const days = placeDays(weeks);
  const labels = monthLabels(weeks);
  const width = gridWidth(weeks.length);
  const glow = useId();
  const [selection, setSelection] = useState<Selection | null>(null);
  // The tooltip keeps its last day while it fades out.
  const [tip, setTip] = useState<{ index: number; delayed: boolean } | null>(
    null,
  );
  const [revealed, setRevealed] = useState(false);
  const [fade, setFade] = useState<Fade>("none");
  const root = useRef<HTMLDivElement>(null);
  const app = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const closedAt = useRef(-Infinity);
  const selected = selection === null ? undefined : days[selection.index];
  const tipDay = tip === null ? undefined : days[tip.index];

  function select(next: Selection | null) {
    if (next === null) {
      if (selection !== null) closedAt.current = performance.now();
      setSelection(null);
      return;
    }
    if (next.index === selection?.index && next.via === selection.via) return;
    setSelection(next);
    setTip({
      index: next.index,
      delayed:
        selection === null &&
        next.via === "hover" &&
        performance.now() - closedAt.current > WARM_MS,
    });
  }

  /** Where a day's cell sits on screen, through any scroll and scale. */
  function cellRect(index: number) {
    const day = days[index];
    const box = svg.current?.getBoundingClientRect();
    if (!day || !box) return null;
    const scale = box.width / width;
    const left = box.left + day.week * PITCH * scale;
    const top = box.top + (GRID_TOP + day.weekday * PITCH) * scale;
    return { left, top, right: left + CELL * scale };
  }

  function placeTooltip() {
    const element = tooltip.current;
    const frame = root.current?.getBoundingClientRect();
    const cell = tip && cellRect(tip.index);
    if (!element || !frame || !cell) return;
    const center = (cell.left + cell.right) / 2 - frame.left;
    const left = Math.min(
      Math.max(center - element.offsetWidth / 2, -8),
      frame.width + 8 - element.offsetWidth,
    );
    element.style.left = `${left}px`;
    element.style.top = `${cell.top - frame.top - element.offsetHeight - 8}px`;
    element.style.transformOrigin = `${center - left}px 100%`;
  }

  useLayoutEffect(placeTooltip);

  useEffect(() => {
    const element = scroller.current;
    const observer = new ResizeObserver(() => setFade(hiddenEdges(element)));
    if (element) observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = root.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    if (element) observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // pointerup, not pointerdown: a scroll that starts outside ends in pointercancel.
    const tapOutside = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && app.current?.contains(event.target))
        return;
      setSelection((current) => (current?.via === "touch" ? null : current));
    };
    document.addEventListener("pointerup", tapOutside);
    return () => document.removeEventListener("pointerup", tapOutside);
  }, []);

  function dayAt(clientX: number, clientY: number): number | null {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return null;
    const scale = width / box.width;
    const cell = cellAt(
      (clientX - box.left) * scale,
      (clientY - box.top) * scale - GRID_TOP,
      weeks.length,
    );
    return cell && dayIndexAt(days, cell.week, cell.weekday);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const index = dayAt(event.clientX, event.clientY);
    if (index !== null) select({ index, via: "hover" });
    else if (selection?.via === "hover") select(null);
  }

  function onPointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch" && selection?.via === "hover")
      select(null);
  }

  // A pen that hovered its day pins it on tap, like a finger.
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    const index = dayAt(event.clientX, event.clientY);
    select(
      index === null ||
        (index === selection?.index && selection.via === "touch")
        ? null
        : { index, via: "touch" },
    );
  }

  function onScroll() {
    setFade(hiddenEdges(scroller.current));
    if (selection?.via === "hover" || selection?.via === "touch") select(null);
    else placeTooltip();
  }

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    // Pointer focus keeps the pointer's day; keyboard focus starts on today.
    if (selection === null && event.currentTarget.matches(":focus-visible"))
      select({ index: days.length - 1, via: "focus" });
  }

  function onBlur() {
    if (selection?.via === "focus" || selection?.via === "keyboard")
      select(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Escape") {
      if (selection === null) return;
      event.preventDefault();
      select(null);
      return;
    }
    const move = moveForKey(event.key);
    if (move === null) return;
    event.preventDefault();
    const index = moveTo(days, selection?.index ?? null, move);
    select({ index, via: "keyboard" });
    // Keep the day in view where the graph scrolls.
    const cell = cellRect(index);
    const frame = scroller.current?.getBoundingClientRect();
    if (!cell || !frame || !scroller.current) return;
    const margin = 32;
    if (cell.left < frame.left + margin)
      scroller.current.scrollBy({ left: cell.left - frame.left - margin });
    else if (cell.right > frame.right - margin)
      scroller.current.scrollBy({ left: cell.right - frame.right + margin });
  }

  return (
    // The focus ring frames the visible graph, not the wider scrolled content.
    <div
      ref={root}
      className="has-focus-visible:outline-accent/60 relative mt-4 rounded-lg outline-offset-4 has-focus-visible:outline-2"
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        data-reveal={revealed ? "shown" : "pending"}
        style={
          fade === "none"
            ? undefined
            : {
                maskImage: `linear-gradient(90deg, transparent, #000 ${fade === "left" || fade === "both" ? 32 : 0}px, #000 calc(100% - ${fade === "right" || fade === "both" ? 32 : 0}px), transparent)`,
              }
        }
        // rtl starts the scroll at the latest weeks with no script and no jump,
        // so until it is measured a phone's graph hides its oldest weeks on the left.
        className="group/graph -mx-5 -my-1.5 overflow-x-auto overscroll-x-contain px-5 py-1.5 [direction:rtl] [scrollbar-width:none] max-sm:[mask-image:linear-gradient(90deg,transparent,#000_32px)] [&::-webkit-scrollbar]:hidden"
      >
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- role="application": one tab stop that reads days with the arrow keys */}
        <div
          ref={app}
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
          tabIndex={0}
          role="application"
          aria-label="GitHub contribution graph"
          data-selecting={selection !== null || undefined}
          aria-describedby={describedBy}
          className="w-full min-w-max cursor-default touch-manipulation scroll-my-6 outline-none [direction:ltr] sm:min-w-0"
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerUp={onPointerUp}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        >
          <svg
            ref={svg}
            width={width * PHONE_SCALE}
            height={GRID_HEIGHT * PHONE_SCALE}
            viewBox={`0 0 ${width} ${GRID_HEIGHT}`}
            overflow="visible"
            aria-hidden="true"
            focusable="false"
            className="block h-auto sm:w-full"
          >
            <defs>
              <filter id={glow} x="-1" y="-1" width="3" height="3">
                <feGaussianBlur stdDeviation="2.5" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.5" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {labels.map(({ week, label }) => (
              <text
                key={week}
                x={week * PITCH}
                y={10}
                // 11px on screen at every scale: 8.8 is 11 / PHONE_SCALE.
                className="fill-fg-3 text-[11px] max-sm:text-[8.8px]"
              >
                {label}
              </text>
            ))}
            {weeks.map((column, week) => (
              <g
                key={week}
                data-week
                className="transition-opacity duration-200 ease-out motion-safe:group-data-[reveal=pending]/graph:opacity-0"
                style={{
                  transitionDelay: `${Math.round((week / weeks.length) * REVEAL_SPREAD_MS)}ms`,
                }}
              >
                {column.map(
                  (day, weekday) =>
                    day && (
                      <rect
                        key={weekday}
                        x={week * PITCH}
                        y={GRID_TOP + weekday * PITCH}
                        width={CELL}
                        height={CELL}
                        rx={2}
                        fill={cellFill(day.level)}
                        filter={
                          day.level === "FOURTH_QUARTILE"
                            ? `url(#${glow})`
                            : undefined
                        }
                      />
                    ),
                )}
              </g>
            ))}
            {selected && (
              <rect
                x={selected.week * PITCH - 0.5}
                y={GRID_TOP + selected.weekday * PITCH - 0.5}
                width={CELL + 1}
                height={CELL + 1}
                rx={2.5}
                fill="none"
                stroke="#ffffffcc"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        </div>
      </div>
      <div
        ref={tooltip}
        aria-hidden="true"
        data-open={selection !== null}
        className={cn(
          "material pointer-events-none absolute top-0 left-0 rounded-lg px-2 py-1 text-[12px]/4 whitespace-nowrap shadow-[inset_0_1px_0_#ffffff12,0_6px_16px_-4px_#00000080] transition-[opacity,scale] duration-150 ease-out data-[open=false]:scale-[.97] data-[open=false]:opacity-0",
          tip?.delayed && "data-[open=true]:delay-100",
        )}
      >
        {tipDay && (
          <>
            <span className="text-fg font-medium tabular-nums">
              {contributions(tipDay.count)}
            </span>{" "}
            <span className="text-fg-2">
              on {tooltipDate(tipDay.date, days.at(-1)?.date ?? tipDay.date)}
            </span>
          </>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {selection?.via === "keyboard" && selected
          ? `${contributions(selected.count)} on ${longDate(selected.date)}`
          : ""}
      </span>
    </div>
  );
}
