import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Share } from "~/components/work/share";
import { projects } from "~/content/projects";

/**
 * The projects' preview videos: each project's card with its lead clip
 * playing where the still capture sits. scripts/og-project-videos.tsx
 * renders them.
 */
export const ProjectVideos = {
  /** Where they are kept, from the repository root. The site serves it as /og-video. */
  DIR: "public/og-video",
  STAMP: "scripts/og-project-videos.stamp",
  /** What draws and encodes every one: a change to any means rendering them all again. */
  SOURCES: [
    "src/lib/project-card.tsx",
    "src/lib/share-card.tsx",
    "src/assets/card-backdrop.jpg",
    "scripts/og-project-videos.tsx",
  ],
  stamp(parts: readonly Uint8Array[]): string {
    const hash = createHash("sha256");
    for (const part of parts) hash.update(`${part.length}\n`).update(part);
    return hash.digest("hex");
  },
  /** The stamp of what the videos would be rendered from now, under `root`. */
  async current(root: string): Promise<string> {
    const text = (value: string) => new TextEncoder().encode(value);
    const file = (path: string) => readFile(join(root, path));
    const parts = await Promise.all([
      ...ProjectVideos.SOURCES.map(file),
      ...projects.flatMap((project) => {
        const clip = Share.clip(project);
        if (clip === null) return [];
        return [
          text(project.title),
          text(Share.tagline(project)),
          file(join("public", clip.src)),
          file(join("public", clip.poster)),
        ];
      }),
    ]);
    return ProjectVideos.stamp(parts);
  },
} as const;
