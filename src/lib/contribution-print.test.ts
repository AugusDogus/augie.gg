import { describe, expect, test } from "bun:test";
import {
  cellAt,
  contributions,
  dayIndexAt,
  inks,
  longDay,
  monthYear,
  moveForKey,
  moveTo,
  placeDays,
  printPaths,
  shortDay,
  splitWeeks,
  summary,
} from "./contribution-print";
import type { ContributionDay, ContributionLevel } from "./github";

const day = (
  date: string,
  count = 0,
  level: ContributionLevel = "NONE",
): ContributionDay => ({ date, count, level });

/** Sun Nov 1 .. Tue Nov 10, 2026: a full week, then a partial one. */
const weeks: (ContributionDay | null)[][] = [
  [
    day("2026-11-01"),
    day("2026-11-02", 3, "FIRST_QUARTILE"),
    day("2026-11-03", 1, "FIRST_QUARTILE"),
    day("2026-11-04"),
    day("2026-11-05", 14, "FOURTH_QUARTILE"),
    day("2026-11-06", 5, "SECOND_QUARTILE"),
    day("2026-11-07"),
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

describe("print inks", () => {
  test("every level maps to a base ink, and only SECOND_QUARTILE dithers", () => {
    expect(inks("NONE")).toEqual({ base: 0, dither: null });
    expect(inks("FIRST_QUARTILE")).toEqual({ base: 1, dither: null });
    expect(inks("SECOND_QUARTILE")).toEqual({ base: 1, dither: 2 });
    expect(inks("THIRD_QUARTILE")).toEqual({ base: 2, dither: null });
    expect(inks("FOURTH_QUARTILE")).toEqual({ base: 3, dither: null });
  });

  test("a SECOND_QUARTILE tile is an 8 of 16 Bayer checker over ink 1", () => {
    const paths = printPaths([[day("2026-11-01", 5, "SECOND_QUARTILE")]]);
    expect(paths[1]).toBe("M0 0h8v8h-8z");
    const cells = paths[2].match(/M\d+ \d+h2v2h-2z/g) ?? [];
    expect(cells).toHaveLength(8);
    expect(cells).toContain("M0 0h2v2h-2z");
    expect(cells).not.toContain("M2 0h2v2h-2z");
    expect(paths[0]).toBe("");
    expect(paths[3]).toBe("");
  });

  test("tiles sit on a 10px pitch by week and weekday, leaving null slots blank", () => {
    const paths = printPaths(weeks);
    expect(paths[0]).toBe(
      "M0 0h8v8h-8zM0 30h8v8h-8zM0 60h8v8h-8zM10 10h8v8h-8z",
    );
    expect(paths[1]).toStartWith("M0 10h8v8h-8zM0 20h8v8h-8zM0 50h8v8h-8z");
    expect(paths[2]).toStartWith("M0 50h2v2h-2z");
    expect(paths[2]).toEndWith("M10 20h8v8h-8z");
    expect(paths[3]).toBe("M0 40h8v8h-8zM10 0h8v8h-8z");
  });
});

describe("halves", () => {
  test("53 weeks split 27 + 26 and 54 split 27 + 27", () => {
    const halves = (length: number) =>
      splitWeeks(Array.from({ length }, (_, week) => week)).map(
        (half) => half.length,
      );
    expect(halves(53)).toEqual([27, 26]);
    expect(halves(54)).toEqual([27, 27]);
  });
});

describe("wording", () => {
  test("zero, singular, and plural counts", () => {
    expect(contributions(0)).toBe("No contributions");
    expect(contributions(1)).toBe("1 contribution");
    expect(contributions(14)).toBe("14 contributions");
    expect(contributions(7476)).toBe("7,476 contributions");
  });

  test("days read as their calendar date in Chicago", () => {
    expect(shortDay("2026-03-03")).toBe("Tue, Mar 3, 2026");
    expect(longDay("2026-03-03")).toBe("Tuesday, March 3, 2026");
    expect(shortDay("2026-01-01")).toBe("Thu, Jan 1, 2026");
  });

  test("end labels are the month and year in UTC", () => {
    expect(monthYear("2025-11-02")).toBe("Nov 2025");
    expect(monthYear("2026-11-30")).toBe("Nov 2026");
    expect(monthYear("2026-01-01")).toBe("Jan 2026");
  });

  test("the summary names the range, active days, and busiest day", () => {
    expect(summary(placeDays(weeks), 46)).toBe(
      "46 contributions from November 1, 2026 to November 10, 2026, with activity on 6 of 10 days. Busiest day: Thursday, November 5, 2026, with 14. Use the arrow keys to read each day.",
    );
  });

  test("an empty year drops the busiest day", () => {
    expect(summary(placeDays([[day("2026-11-01")]]), 0)).toBe(
      "No contributions from November 1, 2026 to November 1, 2026, with activity on 0 of 1 days. Use the arrow keys to read each day.",
    );
  });
});

describe("pointer cells", () => {
  test("each 10px pitch maps to one tile, gaps included", () => {
    expect(cellAt(0, 0, 27)).toEqual({ column: 0, row: 0 });
    expect(cellAt(9.9, 9.9, 27)).toEqual({ column: 0, row: 0 });
    expect(cellAt(269, 69, 27)).toEqual({ column: 26, row: 6 });
  });

  test("points outside the half's grid hit nothing", () => {
    expect(cellAt(-0.5, 0, 27)).toBeNull();
    expect(cellAt(0, -0.5, 27)).toBeNull();
    expect(cellAt(270, 0, 27)).toBeNull();
    expect(cellAt(0, 70, 27)).toBeNull();
  });

  test("slots resolve to day indices, and null slots to nothing", () => {
    const days = placeDays(weeks);
    expect(dayIndexAt(days, 1, 2)).toBe(9);
    expect(days[9]?.date).toBe("2026-11-10");
    expect(dayIndexAt(days, 1, 3)).toBeNull();
    expect(dayIndexAt(days, 2, 0)).toBeNull();
  });
});

describe("keyboard", () => {
  const days = placeDays(weeks);

  test("arrows, Home, and End map to moves; other keys don't", () => {
    expect(moveForKey("ArrowLeft")).toBe("previousWeek");
    expect(moveForKey("ArrowRight")).toBe("nextWeek");
    expect(moveForKey("ArrowUp")).toBe("previousDay");
    expect(moveForKey("ArrowDown")).toBe("nextDay");
    expect(moveForKey("Home")).toBe("first");
    expect(moveForKey("End")).toBe("last");
    expect(moveForKey("Enter")).toBeNull();
  });

  test("weeks keep the weekday, days follow the calendar", () => {
    expect(moveTo(days, 2, "nextWeek")).toBe(9);
    expect(moveTo(days, 9, "previousWeek")).toBe(2);
    expect(moveTo(days, 6, "nextDay")).toBe(7);
    expect(moveTo(days, 7, "previousDay")).toBe(6);
  });

  test("moves stop at the edges and skip blank slots", () => {
    expect(moveTo(days, 0, "previousDay")).toBe(0);
    expect(moveTo(days, 9, "nextDay")).toBe(9);
    expect(moveTo(days, 2, "previousWeek")).toBe(2);
    expect(moveTo(days, 3, "nextWeek")).toBe(3);
  });

  test("Home and End jump to the ends; a fresh move starts from the latest day", () => {
    expect(moveTo(days, 4, "first")).toBe(0);
    expect(moveTo(days, 4, "last")).toBe(9);
    expect(moveTo(days, null, "first")).toBe(0);
    expect(moveTo(days, null, "previousWeek")).toBe(9);
  });
});
