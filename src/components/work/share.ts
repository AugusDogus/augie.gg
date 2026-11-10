import type { Project } from "~/content/projects";
import { Blurb } from "./blurb";
import { Catalog } from "./catalog";

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Not valid encoding: it names no project either way.
    return segment;
  }
}

/**
 * A project as a link preview sees it. `/?p=<title>` is served by the page
 * at `/p/<title>` (next.config.js rewrites it), which is home with that
 * project's name, blurb and card in its metadata.
 */
export const Share = {
  /** A project's title as path segments: a contribution's `owner/repo` is two. */
  segments(title: string): string[] {
    return title.split("/");
  },
  /** The project a path names, however its slashes and spaces arrived encoded. */
  find(segments: readonly string[]): Project | undefined {
    return Catalog.find(segments.map(decode).join("/"));
  },
  /** The link that opens a project, as the address bar writes it (lib/peek.ts). */
  link(title: string, origin: string): string {
    const url = new URL("/", origin);
    url.searchParams.set("p", title);
    return url.href;
  },
  /** Where a project's card is served. */
  card(title: string): string {
    return `/og/${Share.segments(title).map(encodeURIComponent).join("/")}`;
  },
  /** What a preview says under the title: the blurb as it reads. */
  description(project: Project): string {
    return Blurb.plain(project.blurb);
  },
} as const;
