import { describe, expect, test } from "bun:test";
import { type Project, projects } from "~/content/projects";
import { archivedProjects, featuredProjects } from "~/lib/projects";
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
});

describe("Catalog counts", () => {
  test("counts every project once", () => {
    expect(Catalog.count).toBe(projects.length);
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
