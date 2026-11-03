import type { ContributionDay, ContributionLevel } from "~/lib/github";

export type Week = readonly (ContributionDay | null)[];
export type PlacedDay = ContributionDay & { week: number; weekday: number };

/** 8px cells on a 10.5px pitch: 53 weeks fill ~560px. */
export const CELL = 8;
export const GAP = 2.5;
export const PITCH = CELL + GAP;
export const ROWS = 7;
/** Month labels sit in a band above the cells. */
export const GRID_TOP = 18;
export const GRID_HEIGHT = GRID_TOP + ROWS * PITCH - GAP;
export const gridWidth = (columns: number) => columns * PITCH - GAP;

/** Shade by this window's percentiles of active days: the accent at 24%, 46%, 72%, and 100%. */
export function cellFill(level: ContributionLevel): string {
  switch (level) {
    case "NONE":
      return "#ffffff0f";
    case "FIRST_QUARTILE":
      return "#8fe3f03d";
    case "SECOND_QUARTILE":
      return "#8fe3f075";
    case "THIRD_QUARTILE":
      return "#8fe3f0b8";
    case "FOURTH_QUARTILE":
      return "#8fe3f0";
    default: {
      const unreachable: never = level;
      return unreachable;
    }
  }
}

/**
 * GitHub's levels scale with the busiest day, so one outlier sinks every other
 * day to the first. Cut at the nearest-rank p50, p75, and p90 of the active
 * days instead.
 */
export function relevel(weeks: readonly Week[]): Week[] {
  const counts = weeks
    .flatMap((days) => days.map((day) => day?.count ?? 0))
    .filter((count) => count > 0)
    .sort((a, b) => a - b);
  const rank = (percent: number) =>
    counts[Math.ceil((percent * counts.length) / 100) - 1] ?? 0;
  const p50 = rank(50),
    p75 = rank(75),
    p90 = rank(90);
  const level = (count: number): ContributionLevel =>
    count === 0
      ? "NONE"
      : count <= p50
        ? "FIRST_QUARTILE"
        : count <= p75
          ? "SECOND_QUARTILE"
          : count <= p90
            ? "THIRD_QUARTILE"
            : "FOURTH_QUARTILE";
  return weeks.map((days) =>
    days.map((day) => day && { ...day, level: level(day.count) }),
  );
}

/** The window's days in calendar order, with their grid slot. */
export function placeDays(weeks: readonly Week[]): PlacedDay[] {
  return weeks.flatMap((days, week) =>
    days.flatMap((day, weekday) =>
      day === null ? [] : [{ ...day, week, weekday }],
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

/** The cell under a point in grid coordinates; each cell owns its trailing gap. */
export function cellAt(
  x: number,
  y: number,
  columns: number,
): { week: number; weekday: number } | null {
  const week = Math.floor(x / PITCH),
    weekday = Math.floor(y / PITCH);
  if (week < 0 || week >= columns || weekday < 0 || weekday >= ROWS)
    return null;
  return { week, weekday };
}

/** A label over each week that opens a month, dropped where it would collide or overflow. */
export function monthLabels(
  weeks: readonly Week[],
): { week: number; label: string }[] {
  const starts: { week: number; label: string }[] = [];
  let previous: string | null = null;
  weeks.forEach((days, week) => {
    const first = days.find((day) => day !== null);
    if (!first) return;
    const label = monthName(first.date);
    if (label !== previous) starts.push({ week, label });
    previous = label;
  });
  return starts.filter(
    ({ week }, i) =>
      week + 3 <= weeks.length && (starts[i + 1]?.week ?? Infinity) - week >= 3,
  );
}

/** Streaks of days with any contributions. The window's last day is today. */
export function streaks(days: readonly ContributionDay[]): {
  longest: number;
  current: number;
} {
  let longest = 0,
    run = 0;
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // A streak that ran through yesterday is still alive until today ends.
  let current = 0;
  const end = days.at(-1)?.count === 0 ? days.length - 2 : days.length - 1;
  for (let i = end; i >= 0 && (days[i]?.count ?? 0) > 0; i--) current++;
  return { longest, current };
}

/** The day with the most contributions, latest on a tie; null when there are none. */
export function busiestDay<T extends ContributionDay>(
  days: readonly T[],
): T | null {
  return days.reduce<T | null>(
    (best, day) =>
      day.count > 0 && day.count >= (best?.count ?? 0) ? day : best,
    null,
  );
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

/** Stays put at the edges and beside blank slots. With nothing selected, starts from today. */
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

export const dayCount = (count: number) =>
  `${count.toLocaleString("en-US")} day${count === 1 ? "" : "s"}`;

/**
 * Dates are calendar days, not instants: noon UTC keeps the day stable in
 * Chicago, and pinning the zone shows every visitor the same day.
 */
const chicago = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "America/Chicago" });
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const month = chicago({ month: "short" });
const weekdayDate = chicago({
  weekday: "short",
  month: "short",
  day: "numeric",
});
const short = chicago({ month: "short", day: "numeric" });
const long = chicago({
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const plain = chicago({ month: "long", day: "numeric", year: "numeric" });

/** `Nov` */
export const monthName = (iso: string) => month.format(noon(iso));
/** `Sun, Oct 25` */
export const tooltipDate = (iso: string) => weekdayDate.format(noon(iso));
/** `Oct 25` */
export const shortDate = (iso: string) => short.format(noon(iso));
/** `Sunday, October 25, 2026` */
export const longDate = (iso: string) => long.format(noon(iso));

export function summary(
  total: number,
  firstDay: string,
  lastDay: string,
  longest: number,
): string {
  return `${contributions(total)} from ${plain.format(noon(firstDay))} to ${plain.format(noon(lastDay))}. Longest streak ${dayCount(longest)}.`;
}
