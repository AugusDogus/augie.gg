import type { Media } from "~/content/projects";

/** A phone set in front of a desktop capture hangs this share of the width below it. */
const OVERHANG = 0.07;
/** A phone shown on its own takes this share of the width. */
const LONE_PHONE = 0.36;

/** Height over width of a capture in its frame. */
function framedHeight(media: Media): number {
  const height = media.height / media.width;
  switch (media.frame) {
    case "desktop":
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
 * What a project's captures show: its first desktop capture with its first
 * phone capture set in front, image or video alike, or a phone on its own.
 */
export type Showcase =
  | { kind: "desktop"; lead: Media; phone: Media | null }
  | { kind: "phone"; phone: Media };

export const Showcase = {
  /** Null when there is nothing to show. */
  of(media: readonly Media[] | undefined): Showcase | null {
    const lead = media?.find((item) => item.frame === "desktop");
    const phone = media?.find((item) => item.frame === "phone") ?? null;
    if (lead !== undefined) return { kind: "desktop", lead, phone };
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
            (showcase.phone === null ? 0 : OVERHANG))
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
} as const;
