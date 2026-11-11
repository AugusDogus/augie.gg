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

  test("links to a project the way the address bar names it", () => {
    expect(Share.link("oven-sh/bun", "https://augie.gg")).toBe(
      "https://augie.gg/?p=oven-sh%2Fbun",
    );
    for (const project of projects) {
      const link = new URL(Share.link(project.title, "https://augie.gg"));
      expect(link.pathname).toBe("/");
      expect(link.searchParams.get("p")).toBe(project.title);
    }
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
  test("a card says the whole blurb, or only its first sentence when it runs long", () => {
    const short = "A shot timer for mobile. It listens for peaks.";
    expect(Share.tagline({ blurb: short })).toBe(short);
    const first =
      "A compatibility shim that lets one tool authenticate another with an API key, working around a null that the key's auth reports.";
    expect(
      Share.tagline({
        blurb: `${first} Implemented in Rust, C, Go, and Bun, with benchmarks.`,
      }),
    ).toBe(first);
  });

  test("a long blurb of one sentence stays whole, and a version number is not a sentence's end", () => {
    const one = `${"A fork adding live previews, reordering and persisted ordering, ".repeat(3)}and more.`;
    expect(Share.tagline({ blurb: one })).toBe(one);
    const versioned = `Upgraded to v1.1 and then onwards, ${"with a great many further changes, ".repeat(4)}all merged. Second sentence.`;
    expect(Share.tagline({ blurb: versioned })).toBe(
      versioned.replace(" Second sentence.", ""),
    );
  });

  test("a card's words read as the blurb does, without its link markup", () => {
    expect(
      Share.tagline({ blurb: "A fork of [oven-sh/bun](https://bun.sh)." }),
    ).toBe("A fork of oven-sh/bun.");
  });

  test("every project has its own file name for a preview video", () => {
    expect(Share.slug("Yang / Mars")).toBe("yang-mars");
    expect(Share.slug("acacode/swagger-typescript-api")).toBe(
      "acacode-swagger-typescript-api",
    );
    expect(Share.slug("junkyardindex.com")).toBe("junkyardindex.com");
    const slugs = projects.map((project) => Share.slug(project.title));
    expect(new Set(slugs).size).toBe(projects.length);
  });

  test("only a project whose card shows a video capture has a preview video", () => {
    const clip = {
      kind: "video",
      src: "/work/x/x.mp4",
      poster: "/work/x/x.webp",
      alt: "x",
      width: 1280,
      height: 800,
      frame: "desktop",
    } as const;
    const still = {
      kind: "image",
      src: "/work/x/x.webp",
      alt: "x",
      width: 1280,
      height: 800,
      frame: "desktop",
    } as const;
    expect(Share.video({ title: "Yang / Mars", media: [clip] })).toBe(
      "/og-video/yang-mars.mp4",
    );
    expect(Share.video({ title: "x", media: [still] })).toBeNull();
    // The card shows the lead capture, here a still, not the phone beside it.
    expect(
      Share.video({ title: "x", media: [still, { ...clip, frame: "phone" }] }),
    ).toBeNull();
    expect(Share.video({ title: "x" })).toBeNull();
  });
});
