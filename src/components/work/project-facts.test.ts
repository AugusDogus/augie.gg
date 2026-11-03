import { describe, expect, test } from "bun:test";
import { projects } from "~/content/projects";
import { Destination, monthYear } from "./project-facts";

describe("monthYear", () => {
  test("names the month and year of a date", () => {
    expect(monthYear("2025-06-19")).toBe("June 2025");
    expect(monthYear("2016-12-01")).toBe("December 2016");
    expect(monthYear("2026-01-31")).toBe("January 2026");
  });

  test("rejects malformed dates", () => {
    expect(monthYear("2025-13-01")).toBeNull();
    expect(monthYear("June 2025")).toBeNull();
  });

  test("reads every project date", () => {
    for (const project of projects)
      expect(monthYear(project.date)).not.toBeNull();
  });
});

describe("Destination.of", () => {
  test("labels GitHub repositories, pull requests, and websites", () => {
    expect(
      Destination.of({ href: "https://github.com/AugusDogus/multiplex" }),
    ).toEqual({
      kind: "repository",
      href: "https://github.com/AugusDogus/multiplex",
    });
    expect(
      Destination.of({ href: "https://github.com/oven-sh/bun/pull/8875" }),
    ).toEqual({
      kind: "pull-request",
      href: "https://github.com/oven-sh/bun/pull/8875",
    });
    expect(Destination.of({ href: "https://whisp.chat" })).toEqual({
      kind: "website",
      href: "https://whisp.chat",
    });
  });

  test("notes private repositories without a link", () => {
    expect(Destination.of({ private: true })).toEqual({ kind: "private" });
    expect(Destination.of({})).toEqual({ kind: "none" });
  });
});
