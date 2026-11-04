import type { Media } from "~/content/projects";

/** A phone or TV set in front of a desktop capture hangs this share of the width below it. */
const OVERHANG = 0.07;
/** A phone shown on its own takes this share of the width. */
const LONE_PHONE = 0.36;
/** A TV capture set in front of a desktop capture takes this share of the width. */
const TV_INSET = 0.3;

/** Height over width of a capture in its frame. */
function framedHeight(media: Media): number {
  const height = media.height / media.width;
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

/**
 * What a project's captures show, image or video alike: its first desktop
 * capture (or, without one, its first TV capture) with its first phone capture
 * set in front at the lower right and its first TV capture at the lower left;
 * or a phone on its own.
 */
export type Showcase =
  | { kind: "desktop"; lead: Media; phone: Media | null; tv: Media | null }
  | { kind: "phone"; phone: Media };

export const Showcase = {
  /** Null when there is nothing to show. */
  of(media: readonly Media[] | undefined): Showcase | null {
    const desktop = media?.find((item) => item.frame === "desktop");
    const tv = media?.find((item) => item.frame === "tv") ?? null;
    const phone = media?.find((item) => item.frame === "phone") ?? null;
    if (desktop !== undefined)
      return { kind: "desktop", lead: desktop, phone, tv };
    if (tv !== null) return { kind: "desktop", lead: tv, phone, tv: null };
    return phone === null ? null : { kind: "phone", phone };
  },
  /** The capture a thumbnail crops. */
  cover(showcase: Showcase): Media {
    return showcase.kind === "desktop" ? showcase.lead : showcase.phone;
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
