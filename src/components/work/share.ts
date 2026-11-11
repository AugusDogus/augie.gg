import type { Media, Project } from "~/content/projects";
import { Blurb } from "./blurb";
import { Catalog } from "./catalog";
import { Showcase } from "./showcase";

/** A blurb longer than this is more than a card's column holds comfortably. */
const LONG = 150;
/** A first sentence: up to its stop, where a space and a capital follow. */
const FIRST_SENTENCE = /^(.*?[.!?])\s+(?=[A-Z])/s;

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
  /**
   * What a card says under the title: the blurb as it reads, or only its
   * first sentence when it runs long.
   */
  tagline({ blurb }: Pick<Project, "blurb">): string {
    const whole = Blurb.plain(blurb);
    if (whole.length <= LONG) return whole;
    return FIRST_SENTENCE.exec(whole)?.[1] ?? whole;
  },
  /** A project's title as a file name. */
  slug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "");
  },
  /** The video a card's capture plays: the project's lead capture, when it is one. */
  clip({
    media,
  }: Pick<Project, "media">): Extract<Media, { kind: "video" }> | null {
    const showcase = Showcase.of(media);
    if (showcase === null) return null;
    const lead = showcase.kind === "desktop" ? showcase.lead : showcase.phone;
    return lead.kind === "video" ? lead : null;
  },
  /** Where a project's preview video is served: its card with that capture playing. Null without one. */
  video(project: Pick<Project, "title" | "media">): string | null {
    return Share.clip(project) === null
      ? null
      : `/og-video/${Share.slug(project.title)}.mp4`;
  },
} as const;
