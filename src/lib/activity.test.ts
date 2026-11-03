import { describe, expect, test } from "bun:test";
import {
  busiestDay,
  cellAt,
  cellFill,
  contributions,
  dayCount,
  longDate,
  monthLabels,
  moveForKey,
  moveTo,
  placeDays,
  relevel,
  shortDate,
  streaks,
  summary,
  tooltipDate,
  type Week,
} from "./activity";
import type { ContributionDay, ContributionLevel } from "./github";

const day = (
  date: string,
  count = 0,
  level: ContributionLevel = "NONE",
): ContributionDay => ({ date, count, level });

/** Sun Nov 1 .. Tue Nov 10, 2026: a full week, then a partial one. */
const weeks: Week[] = [
  [
    day("2026-11-01"),
    day("2026-11-02", 3, "FIRST_QUARTILE"),
    day("2026-11-03", 1, "FIRST_QUARTILE"),
    day("2026-11-04"),
    day("2026-11-05", 14, "FOURTH_QUARTILE"),
    day("2026-11-06", 5, "SECOND_QUARTILE"),
    day("2026-11-07", 2, "FIRST_QUARTILE"),
  ],
  [
    day("2026-11-08", 14, "FOURTH_QUARTILE"),
    day("2026-11-09"),
    day("2026-11-10", 9, "THIRD_QUARTILE"),
    null,
    null,
    null,
    null,
  ],
];
const days = placeDays(weeks);

/** A run of consecutive days from `start` with these counts. */
function run(start: string, counts: number[]): ContributionDay[] {
  const from = new Date(`${start}T12:00:00Z`).getTime();
  return counts.map((count, i) =>
    day(new Date(from + i * 86_400_000).toISOString().slice(0, 10), count),
  );
}

describe("cells", () => {
  test("each level is the accent at its quartile opacity, empty days a faint white", () => {
    expect(cellFill("NONE")).toBe("#ffffff0f");
    expect(cellFill("FIRST_QUARTILE")).toBe("#8fe3f03d");
    expect(cellFill("SECOND_QUARTILE")).toBe("#8fe3f075");
    expect(cellFill("THIRD_QUARTILE")).toBe("#8fe3f0b8");
    expect(cellFill("FOURTH_QUARTILE")).toBe("#8fe3f0");
  });

  test("days keep calendar order and their week and weekday slot, skipping blanks", () => {
    expect(days).toHaveLength(10);
    expect(days[7]).toEqual({
      ...day("2026-11-08", 14, "FOURTH_QUARTILE"),
      week: 1,
      weekday: 0,
    });
    expect(days.at(-1)?.date).toBe("2026-11-10");
  });

  test("a point maps to the cell before it, gaps included, and nothing outside the grid", () => {
    expect(cellAt(0, 0, 2)).toEqual({ week: 0, weekday: 0 });
    expect(cellAt(9, 9, 2)).toEqual({ week: 0, weekday: 0 });
    expect(cellAt(10.5, 63, 2)).toEqual({ week: 1, weekday: 6 });
    expect(cellAt(21, 0, 2)).toBeNull();
    expect(cellAt(-1, 0, 2)).toBeNull();
    expect(cellAt(0, 73.5, 2)).toBeNull();
  });
});

describe("relevel", () => {
  const levels = (shaded: readonly Week[]) =>
    shaded.map((column) => column.map((d) => d?.level ?? null));

  test("one outlier takes the top shade without flattening the rest into the lowest", () => {
    // Non-zero counts 1..10 and 191: p50 is 6, p75 is 9, p90 is 10.
    const shaded = relevel([
      run("2026-10-04", [191, 1, 2, 3, 4, 5, 6]),
      [...run("2026-10-11", [7, 8, 9, 10]), null, null, null],
    ]);
    expect(levels(shaded)).toEqual([
      [
        "FOURTH_QUARTILE",
        "FIRST_QUARTILE",
        "FIRST_QUARTILE",
        "FIRST_QUARTILE",
        "FIRST_QUARTILE",
        "FIRST_QUARTILE",
        "FIRST_QUARTILE",
      ],
      [
        "SECOND_QUARTILE",
        "SECOND_QUARTILE",
        "SECOND_QUARTILE",
        "THIRD_QUARTILE",
        null,
        null,
        null,
      ],
    ]);
    expect(placeDays(shaded).map((d) => d.count)).toEqual([
      191, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  test("days without contributions stay NONE, blanks stay blank", () => {
    expect(
      levels(
        relevel([
          [
            day("2026-10-01"),
            day("2026-10-02", 4, "FOURTH_QUARTILE"),
            day("2026-10-03"),
          ],
          [null],
        ]),
      ),
    ).toEqual([["NONE", "FIRST_QUARTILE", "NONE"], [null]]);
    expect(levels(relevel([run("2026-10-01", [0, 0])]))).toEqual([
      ["NONE", "NONE"],
    ]);
  });
});

describe("month labels", () => {
  /** Thirteen weeks of Sundays from Sun Nov 2, 2025. */
  const quarter: Week[] = run(
    "2025-11-02",
    Array.from({ length: 91 }, () => 0),
  ).reduce<ContributionDay[][]>((columns, d, i) => {
    if (i % 7 === 0) columns.push([]);
    columns.at(-1)?.push(d);
    return columns;
  }, []);

  test("label the first week whose first day falls in a new month", () => {
    expect(monthLabels(quarter)).toEqual([
      { week: 0, label: "Nov" },
      { week: 5, label: "Dec" },
      { week: 9, label: "Jan" },
    ]);
  });

  test("drop a label that would crowd the next one or run off the end", () => {
    // Starts on Sun Nov 23: Nov gets two columns before Dec, and the grid ends a week into Feb.
    const crowded = quarter.slice(3).concat([[day("2026-02-01")]]);
    expect(monthLabels(crowded)).toEqual([
      { week: 2, label: "Dec" },
      { week: 6, label: "Jan" },
    ]);
  });

  test("a partial first week is labeled by its first real day", () => {
    const partial: Week[] = [
      [null, null, null, null, null, null, day("2025-11-01")],
      ...quarter,
    ];
    expect(monthLabels(partial)[0]).toEqual({ week: 0, label: "Nov" });
  });
});

describe("streaks", () => {
  test("longest is the longest run of active days", () => {
    expect(streaks(run("2026-10-01", [1, 2, 0, 4, 5, 6, 0, 1])).longest).toBe(
      3,
    );
  });

  test("current counts back from today when today is active", () => {
    expect(streaks(run("2026-10-01", [1, 0, 3, 4, 2])).current).toBe(3);
  });

  test("current still counts from yesterday when today has nothing yet", () => {
    expect(streaks(run("2026-10-01", [1, 0, 3, 4, 0])).current).toBe(2);
  });

  test("current is zero once a whole day is missed", () => {
    expect(streaks(run("2026-10-01", [1, 2, 3, 0, 0])).current).toBe(0);
  });

  test("no days, no streaks", () => {
    expect(streaks([])).toEqual({ longest: 0, current: 0 });
    expect(streaks([day("2026-10-01")])).toEqual({ longest: 0, current: 0 });
  });
});

describe("busiest day", () => {
  test("is the day with the most contributions, the latest on a tie", () => {
    expect(busiestDay(days)?.date).toBe("2026-11-08");
  });

  test("is null when nothing was contributed", () => {
    expect(busiestDay(run("2026-10-01", [0, 0]))).toBeNull();
  });
});

describe("keyboard", () => {
  test("arrows move by week across and by day down; Home and End jump", () => {
    expect(moveForKey("ArrowLeft")).toBe("previousWeek");
    expect(moveForKey("ArrowRight")).toBe("nextWeek");
    expect(moveForKey("ArrowUp")).toBe("previousDay");
    expect(moveForKey("ArrowDown")).toBe("nextDay");
    expect(moveForKey("Home")).toBe("first");
    expect(moveForKey("End")).toBe("last");
    expect(moveForKey("Enter")).toBeNull();
  });

  test("moves land on the neighbor and stay put at edges and blanks", () => {
    expect(moveTo(days, null, "nextWeek")).toBe(9);
    expect(moveTo(days, null, "first")).toBe(0);
    expect(moveTo(days, 2, "nextWeek")).toBe(9);
    expect(moveTo(days, 9, "previousWeek")).toBe(2);
    expect(moveTo(days, 5, "nextWeek")).toBe(5);
    expect(moveTo(days, 1, "previousWeek")).toBe(1);
    expect(moveTo(days, 6, "nextDay")).toBe(7);
    expect(moveTo(days, 0, "previousDay")).toBe(0);
    expect(moveTo(days, 9, "nextDay")).toBe(9);
    expect(moveTo(days, 3, "last")).toBe(9);
  });
});

describe("wording", () => {
  test("counts read naturally", () => {
    expect(contributions(0)).toBe("No contributions");
    expect(contributions(1)).toBe("1 contribution");
    expect(contributions(1234)).toBe("1,234 contributions");
    expect(dayCount(1)).toBe("1 day");
    expect(dayCount(12)).toBe("12 days");
  });

  test("dates are the calendar day in Chicago", () => {
    expect(tooltipDate("2026-10-25", "2026-11-02")).toBe("Sun, Oct 25");
    expect(shortDate("2026-01-01", "2026-11-02")).toBe("Jan 1");
    expect(longDate("2026-10-25")).toBe("Sunday, October 25, 2026");
  });

  test("dates from before the window's final year carry the year", () => {
    expect(tooltipDate("2025-11-02", "2026-11-02")).toBe("Sun, Nov 2, 2025");
    expect(shortDate("2025-12-31", "2026-11-02")).toBe("Dec 31, 2025");
  });

  test("the summary states the total, the window, and the longest streak", () => {
    expect(summary(1234, "2025-11-02", "2026-11-02", 12)).toBe(
      "1,234 contributions from November 2, 2025 to November 2, 2026. Longest streak 12 days.",
    );
  });
});
