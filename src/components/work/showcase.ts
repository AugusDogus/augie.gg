import type { Capture, Media } from "~/content/projects";

/** A phone or TV set in front of a desktop capture hangs this share of the width below it. */
const OVERHANG = 0.07;
/** A phone shown on its own takes this share of the width. */
const LONE_PHONE = 0.36;
/** A TV capture set in front of a desktop capture takes this share of the width. */
const TV_INSET = 0.3;

/** Height over width of a capture or board in its frame. */
function framedHeight(media: Media): number {
  const height = media.height / media.width;
  if (media.kind === "board") return height;
  switch (media.frame) {
    case "desktop":
    case "tv":
      return height;
    case "phone":
      // A 3.2% bezel on every side.
      return height * 0.936 + 0.064;
    default: {
      const unreachable: never = media.frame;
      return unreachable;
    }
  }
}

/** Shown as the lead screen: a board, or a capture framed as a desktop. */
function leads(media: Media): boolean {
  return media.kind === "board" || media.frame === "desktop";
}

function isCapture(media: Media): media is Capture {
  return media.kind !== "board";
}

/**
 * What a project's media shows, image or video alike: its first desktop
 * capture or board (or, without one, its first TV capture) with its first
 * phone capture set in front at the lower right and its first TV capture at
 * the lower left; or a phone on its own. A board leads alone: its viewer
 * takes the whole frame.
 */
export type Showcase =
  | {
      kind: "desktop";
      lead: Media;
      phone: Capture | null;
      tv: Capture | null;
    }
  | { kind: "phone"; phone: Capture };

/** The still a thumbnail crops. */
export type Cover = { src: string; width: number; height: number };

export const Showcase = {
  /** Null when there is nothing to show. */
  of(media: readonly Media[] | undefined): Showcase | null {
    const lead = media?.find(leads);
    if (lead?.kind === "board")
      return { kind: "desktop", lead, phone: null, tv: null };
    const captures = media?.filter(isCapture);
    const tv = captures?.find((item) => item.frame === "tv") ?? null;
    const phone = captures?.find((item) => item.frame === "phone") ?? null;
    if (lead !== undefined) return { kind: "desktop", lead, phone, tv };
    if (tv !== null) return { kind: "desktop", lead: tv, phone, tv: null };
    return phone === null ? null : { kind: "phone", phone };
  },
  /** The still a thumbnail crops: the lead's, or a lone phone's. */
  cover(showcase: Showcase): Cover {
    const media = showcase.kind === "desktop" ? showcase.lead : showcase.phone;
    const src =
      media.kind === "image"
        ? media.src
        : // A video's frame, or a board's render: never the viewer itself.
          media.poster;
    return { src, width: media.width, height: media.height };
  },
  /** Width over height of the whole composition, for fitting it into a box before it renders. */
  aspect(showcase: Showcase): number {
    switch (showcase.kind) {
      case "desktop":
        return (
          1 /
          (framedHeight(showcase.lead) +
            (showcase.phone === null && showcase.tv === null ? 0 : OVERHANG))
        );
      case "phone":
        return 1 / (framedHeight(showcase.phone) * LONE_PHONE);
      default: {
        const unreachable: never = showcase;
        return unreachable;
      }
    }
  },
  /** The composition's lengths, as shares of its width, for laying it out in container units. */
  OVERHANG,
  LONE_PHONE,
  TV_INSET,
} as const;
