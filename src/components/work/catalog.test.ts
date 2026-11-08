import { describe, expect, test } from "bun:test";
import { type Project, projects } from "~/content/projects";
import {
  archivedProjects,
  contributionProjects,
  featuredProjects,
  notableContributions,
} from "~/lib/projects";
import { Catalog } from "./catalog";

const list = [{ title: "a" }, { title: "b" }, { title: "c" }];
const entry = (title: string, extra: Partial<Project> = {}): Project => ({
  title,
  date: "2026-01-01",
  blurb: "",
  ...extra,
});

describe("Catalog.neighbor", () => {
  test("steps forward and back", () => {
    expect(Catalog.neighbor(list, "b", 1)?.title).toBe("c");
    expect(Catalog.neighbor(list, "b", -1)?.title).toBe("a");
  });

  test("stops at either end", () => {
    expect(Catalog.neighbor(list, "a", -1)).toBeNull();
    expect(Catalog.neighbor(list, "c", 1)).toBeNull();
  });

  test("has no neighbor for an unknown title", () => {
    expect(Catalog.neighbor(list, "z", 1)).toBeNull();
  });
});

describe("Catalog.position", () => {
  test("counts from one", () => {
    expect(Catalog.position(list, "a")).toBe(1);
    expect(Catalog.position(list, "c")).toBe(3);
    expect(Catalog.position(list, "z")).toBeNull();
  });
});

describe("Catalog.sequenceFor", () => {
  test("steps featured projects among themselves", () => {
    const first = featuredProjects[0];
    expect(first).toBeDefined();
    if (first) expect(Catalog.sequenceFor(first.title)).toBe(featuredProjects);
  });

  test("steps everything else through the archive", () => {
    const first = archivedProjects[0];
    expect(first).toBeDefined();
    if (first) expect(Catalog.sequenceFor(first.title)).toBe(archivedProjects);
  });

  test("steps contributions among themselves, in the open source section's order", () => {
    const last = contributionProjects.at(-1);
    expect(last).toBeDefined();
    if (last)
      expect(Catalog.sequenceFor(last.title)).toBe(contributionProjects);
  });
});

describe("Contributions", () => {
  test("stay out of the archive, which lists only Augie's own projects", () => {
    expect(
      archivedProjects.some((project) => project.labels?.includes("oss")),
    ).toBe(false);
  });

  test("list the notable ones first, then the rest", () => {
    expect(contributionProjects.slice(0, notableContributions.length)).toEqual([
      ...notableContributions,
    ]);
    expect(contributionProjects).toHaveLength(
      projects.filter((project) => project.labels?.includes("oss")).length,
    );
  });
});

describe("Catalog counts", () => {
  test("counts each of Augie's own projects once, leaving contributions to the open source section", () => {
    expect(Catalog.count).toBe(
      projects.filter((project) => !project.labels?.includes("oss")).length,
    );
  });

  test("leaves notable contributions out of the rest", () => {
    const rest = Catalog.moreContributions([
      entry("notable", { labels: ["oss"], notable: 1 }),
      entry("minor", { labels: ["oss"] }),
      entry("own project", { labels: ["active"] }),
      entry("in review", { labels: ["pending"] }),
    ]);
    expect(rest.map((project) => project.title)).toEqual(["minor"]);
  });

  test("labels every notable contribution as open source", () => {
    for (const project of projects)
      if (project.notable !== undefined)
        expect(project.labels).toContain("oss");
  });
});
