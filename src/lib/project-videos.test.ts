import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { Share } from "~/components/work/share";
import { projects } from "~/content/projects";
import { ProjectVideos } from "./project-videos";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("ProjectVideos.stamp", () => {
  test("is the same for the same parts", () => {
    expect(ProjectVideos.stamp([bytes("card"), bytes("clip")])).toBe(
      ProjectVideos.stamp([bytes("card"), bytes("clip")]),
    );
  });

  test("changes when any part changes", () => {
    const stamp = ProjectVideos.stamp([bytes("card"), bytes("clip")]);
    expect(ProjectVideos.stamp([bytes("card."), bytes("clip")])).not.toBe(
      stamp,
    );
    expect(ProjectVideos.stamp([bytes("card"), bytes("clip.")])).not.toBe(
      stamp,
    );
  });

  test("tells where one part ends and the next begins", () => {
    expect(ProjectVideos.stamp([bytes("ab"), bytes("c")])).not.toBe(
      ProjectVideos.stamp([bytes("a"), bytes("bc")]),
    );
  });
});

describe("public/og-video", () => {
  const root = new URL("../../", import.meta.url);
  const again =
    "The cards themselves are fine, but a preview that plays video would show an older one. Render them again with: bun run og:projects";

  test("holds one video for each project whose card shows a clip, and nothing else", async () => {
    const expected = projects
      .flatMap((project) => Share.video(project) ?? [])
      .map((href) => href.replace("/og-video/", ""));
    const found = await readdir(new URL(ProjectVideos.DIR, root));
    const missing = expected.filter((name) => !found.includes(name));
    const extra = found.filter((name) => !expected.includes(name));
    if (missing.length > 0 || extra.length > 0)
      throw new Error(
        `${ProjectVideos.DIR} is out of step with the projects: missing ${missing.join(", ") || "none"}; left over ${extra.join(", ") || "none"}. ${again}`,
      );
    expect(found.length).toBe(expected.length);
  });

  test("was rendered from the cards and clips as they are now", async () => {
    const rendered = await Bun.file(new URL(ProjectVideos.STAMP, root)).text();
    if (rendered.trim() !== (await ProjectVideos.current(root.pathname)))
      throw new Error(
        `${ProjectVideos.DIR} was rendered from older cards or clips: ${ProjectVideos.SOURCES.join(", ")}, a project's title, blurb, lead clip or its poster changed since. ${again}`,
      );
  });
});
