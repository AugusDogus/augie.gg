import { describe, expect, test } from "bun:test";
import { projects } from "~/content/projects";
import { Share } from "./share";

describe("Share", () => {
  test("every project is found again from its path, however it arrives encoded", () => {
    for (const project of projects) {
      const segments = Share.segments(project.title);
      expect(Share.find(segments)).toBe(project);
      // As a URL carries them.
      expect(Share.find(segments.map(encodeURIComponent))).toBe(project);
      // As one segment with its slashes escaped, the way `?p=` is written.
      expect(Share.find([encodeURIComponent(project.title)])).toBe(project);
    }
  });

  test("a contribution's owner and repository are two segments", () => {
    expect(Share.segments("oven-sh/bun")).toEqual(["oven-sh", "bun"]);
    expect(Share.card("oven-sh/bun")).toBe("/og/oven-sh/bun");
    expect(Share.card("Yang / Mars")).toBe("/og/Yang%20/%20Mars");
  });

  test("finds nothing for a path that names no project, or is not valid encoding", () => {
    expect(Share.find(["nope"])).toBeUndefined();
    expect(Share.find(["%E0%A4%A"])).toBeUndefined();
  });

  test("describes a project by its blurb as it reads, without link syntax", () => {
    const mods = projects.find((project) => project.title === "Valheim mods");
    expect(mods && Share.description(mods)).toBe(
      "Six Valheim client and server mods, including Buildheim, Player Trading Reforged, and Soundheim.",
    );
  });
});
