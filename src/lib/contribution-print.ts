import { bayerIndex } from "~/lib/flight/texture";
import type { ContributionLevel } from "~/lib/github";

/** Tiles are 8px on a 10px pitch, seven weekdays tall. */
export const PITCH = 10;
const TILE = 8;
export const ROWS = 7;
export const GRID_HEIGHT = ROWS * PITCH - (PITCH - TILE);

export const gridWidth = (columns: number) => columns * PITCH - (PITCH - TILE);

/** `--cal-0` (faintest) to `--cal-3` (solid Whale). */
export type Ink = 0 | 1 | 2 | 3;

/** `dither` overprints half the tile in the print's own 2px Bayer checker. */
export function inks(level: ContributionLevel): {
  base: Ink;
  dither: Ink | null;
} {
  switch (level) {
    case "NONE":
      return { base: 0, dither: null };
    case "FIRST_QUARTILE":
      return { base: 1, dither: null };
    case "SECOND_QUARTILE":
      return { base: 1, dither: 2 };
    case "THIRD_QUARTILE":
      return { base: 2, dither: null };
    case "FOURTH_QUARTILE":
      return { base: 3, dither: null };
    default: {
      const unreachable: never = level;
      return unreachable;
    }
  }
}

/** The 2px cells of a 4x4 tile under the painting's 8/16 threshold. */
const DITHER_CELLS = Array.from({ length: 16 }, (_, i) => ({
  x: i % 4,
  y: Math.floor(i / 4),
})).filter(({ x, y }) => bayerIndex(x, y) < 8);

/** One SVG path per ink, drawn `i0` to `i3`; empty when the ink is unused. */
export function printPaths(
  weeks: readonly (readonly ({ level: ContributionLevel } | null)[])[],
): [string, string, string, string] {
  const paths: [string, string, string, string] = ["", "", "", ""];
  weeks.forEach((week, column) =>
    week.forEach((day, row) => {
      if (day === null) return;
      const x = column * PITCH,
        y = row * PITCH;
      const { base, dither } = inks(day.level);
      paths[base] += `M${x} ${y}h${TILE}v${TILE}h-${TILE}z`;
      if (dither !== null)
        for (const cell of DITHER_CELLS)
          paths[dither] += `M${x + cell.x * 2} ${y + cell.y * 2}h2v2h-2z`;
    }),
  );
  return paths;
}

export const splitAt = (weeks: number) => Math.ceil(weeks / 2);

/** Two half-year strips that sit side by side when they fit and stack when they don't. */
export function splitWeeks<T>(weeks: readonly T[]): [T[], T[]] {
  const at = splitAt(weeks.length);
  return [weeks.slice(0, at), weeks.slice(at)];
}

export type CalendarDay = { date: string; count: number };
export type PlacedDay = CalendarDay & { week: number; weekday: number };

/** The window's days in calendar order, with their grid slot. */
export function placeDays(
  weeks: readonly (readonly (CalendarDay | null)[])[],
): PlacedDay[] {
  return weeks.flatMap((days, week) =>
    days.flatMap((day, weekday) =>
      day === null ? [] : [{ date: day.date, count: day.count, week, weekday }],
    ),
  );
}

export function dayIndexAt(
  days: readonly PlacedDay[],
  week: number,
  weekday: number,
): number | null {
  const index = days.findIndex(
    (day) => day.week === week && day.weekday === weekday,
  );
  return index === -1 ? null : index;
}

/** The tile under a point in a half's own coordinates; each tile owns its trailing gap. */
export function cellAt(
  x: number,
  y: number,
  columns: number,
): { column: number; row: number } | null {
  const column = Math.floor(x / PITCH),
    row = Math.floor(y / PITCH);
  if (column < 0 || column >= columns || row < 0 || row >= ROWS) return null;
  return { column, row };
}

export type Move =
  | "previousWeek"
  | "nextWeek"
  | "previousDay"
  | "nextDay"
  | "first"
  | "last";

export function moveForKey(key: string): Move | null {
  switch (key) {
    case "ArrowLeft":
      return "previousWeek";
    case "ArrowRight":
      return "nextWeek";
    case "ArrowUp":
      return "previousDay";
    case "ArrowDown":
      return "nextDay";
    case "Home":
      return "first";
    case "End":
      return "last";
    default:
      return null;
  }
}

/** Stays put at the edges and on blank slots. With nothing selected, starts from the latest day. */
export function moveTo(
  days: readonly PlacedDay[],
  from: number | null,
  move: Move,
): number {
  const last = days.length - 1;
  const current = from === null ? undefined : days[from];
  if (move === "first") return 0;
  if (from === null || current === undefined) return last;
  const week = (by: number) =>
    dayIndexAt(days, current.week + by, current.weekday) ?? from;
  switch (move) {
    case "last":
      return last;
    case "previousWeek":
      return week(-1);
    case "nextWeek":
      return week(1);
    case "previousDay":
      return Math.max(from - 1, 0);
    case "nextDay":
      return Math.min(from + 1, last);
    default: {
      const unreachable: never = move;
      return unreachable;
    }
  }
}

export function contributions(count: number): string {
  if (count === 0) return "No contributions";
  return `${count.toLocaleString("en-US")} contribution${count === 1 ? "" : "s"}`;
}

/**
 * Dates are calendar days, not instants: noon UTC keeps the day stable in
 * Chicago, and pinning the zone shows every visitor the same day.
 */
const chicago = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "America/Chicago" });
const short = chicago({
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const long = chicago({
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const plain = chicago({ month: "long", day: "numeric", year: "numeric" });
const monthAndYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);

export const shortDay = (iso: string) => short.format(noon(iso));
export const longDay = (iso: string) => long.format(noon(iso));
export const monthYear = (iso: string) => monthAndYear.format(noon(iso));

export function summary(days: readonly PlacedDay[], total: number): string {
  const first = days.at(0),
    last = days.at(-1);
  const range =
    first && last
      ? ` from ${plain.format(noon(first.date))} to ${plain.format(noon(last.date))}`
      : "";
  const active = days.filter((day) => day.count > 0).length;
  const busiest = days.reduce<PlacedDay | null>(
    (best, day) => (day.count > (best?.count ?? 0) ? day : best),
    null,
  );
  return [
    `${contributions(total)}${range}, with activity on ${active} of ${days.length} days.`,
    busiest &&
      `Busiest day: ${longDay(busiest.date)}, with ${busiest.count.toLocaleString("en-US")}.`,
    "Use the arrow keys to read each day.",
  ]
    .filter(Boolean)
    .join(" ");
}
