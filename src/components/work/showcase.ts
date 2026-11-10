import type { Capture, Console, Media } from "~/content/projects";

/** A phone or TV set in front of a desktop capture hangs this share of the width below it. */
const OVERHANG = 0.07;
/** A phone shown on its own takes this share of the width. */
const LONE_PHONE = 0.36;
/** A TV capture set in front of a desktop capture takes this share of the width. */
const TV_INSET = 0.3;
/** A TV's bezel at its sides and top, as a share of the TV's width. */
const TV_BEZEL = 0.025;
/** The deeper bottom bezel a TV stands on, as a share of the TV's width. */
const TV_CHIN = 0.06;
/** A console in front of a TV inset takes this share of the composition's width. */
const CONSOLE = 0.16;
/** How much of the TV's chin the console rises over; it never reaches the screen. */
const CHIN_COVER = 0.75;

/** A TV capture, which alone can have a console in front of it. */
export type TvCapture = Extract<Capture, { frame: "tv" }>;

/** Height over width of a capture or board in its frame. */
function framedHeight(media: Media): number {
  const height = media.height / media.width;
  if (media.kind === "board") return height;
  switch (media.frame) {
    case "desktop":
      return height;
    case "tv":
      return height * (1 - 2 * TV_BEZEL) + TV_BEZEL + TV_CHIN;
    case "phone":
      // A 3.2% bezel on every side.
      return height * 0.936 + 0.064;
    default: {
      const unreachable: never = media;
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

function isTv(media: Capture): media is TvCapture {
  return media.frame === "tv";
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
      tv: TvCapture | null;
    }
  | { kind: "phone"; phone: Capture };

/** The still a thumbnail crops. */
export type Cover = { src: string; width: number; height: number };

/**
 * A still the composition shows, and how the page asks for it: the width it
 * is shown at, as an image's `sizes`, and whether it is served as the file
 * itself, as pixel art is, or resized.
 */
export type Still = Cover & { sizes: string; original: boolean };

/**
 * The widths a phone and a TV set in front of a lead, and a phone on its own,
 * are shown at. A lead's width depends on where the composition sits.
 */
const SIZES = {
  phone: "(max-width: 640px) 25vw, 180px",
  tv: "(max-width: 640px) 35vw, 260px",
  lone: "(max-width: 640px) 40vw, 320px",
} as const;

/** A capture's own pixels, a video's frame, or a board's render: never the viewer itself. */
function cover(media: Media): Cover {
  const src = media.kind === "image" ? media.src : media.poster;
  return { src, width: media.width, height: media.height };
}

function still(media: Media, sizes: string): Still {
  const original = media.kind === "image" && media.pixelated === true;
  return { ...cover(media), sizes, original };
}

export const Showcase = {
  /** Null when there is nothing to show. */
  of(media: readonly Media[] | undefined): Showcase | null {
    const lead = media?.find(leads);
    if (lead?.kind === "board")
      return { kind: "desktop", lead, phone: null, tv: null };
    const captures = media?.filter(isCapture);
    const tv = captures?.find(isTv) ?? null;
    const phone = captures?.find((item) => item.frame === "phone") ?? null;
    if (lead !== undefined) return { kind: "desktop", lead, phone, tv };
    if (tv !== null) return { kind: "desktop", lead: tv, phone, tv: null };
    return phone === null ? null : { kind: "phone", phone };
  },
  /** The still a thumbnail crops: the lead's, or a lone phone's. */
  cover(showcase: Showcase): Cover {
    return cover(showcase.kind === "desktop" ? showcase.lead : showcase.phone);
  },
  /**
   * Every still the composition shows, lead first, as the page asks for
   * each. `lead` is the width the lead is shown at, as an image's `sizes`.
   */
  stills(showcase: Showcase, lead: string): Still[] {
    if (showcase.kind === "phone") return [still(showcase.phone, SIZES.lone)];
    return [
      still(showcase.lead, lead),
      ...(showcase.phone === null ? [] : [still(showcase.phone, SIZES.phone)]),
      ...(showcase.tv === null ? [] : [still(showcase.tv, SIZES.tv)]),
    ];
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
  /**
   * The source of the video the others keep time to when the composition plays
   * more than one: the first of lead, phone and TV that is a video. Null when
   * at most one plays.
   */
  clock(showcase: Showcase): string | null {
    if (showcase.kind === "phone") return null;
    const [first, second] = [showcase.lead, showcase.phone, showcase.tv].filter(
      (media) => media?.kind === "video",
    );
    return first?.kind === "video" && second !== undefined ? first.src : null;
  },
  /** Whether any capture the composition shows is a video, and so has a loop to mark. */
  plays(showcase: Showcase): boolean {
    if (showcase.kind === "phone") return showcase.phone.kind === "video";
    return [showcase.lead, showcase.phone, showcase.tv].some(
      (media) => media?.kind === "video",
    );
  },
  /**
   * How far a TV inset with a console in front of it rises off the bottom, as
   * a share of the composition's width: the console stands on the bottom edge
   * and covers only the TV's chin.
   */
  consoleLift(console: Pick<Console, "width" | "height">): number {
    return (
      (CONSOLE * console.height) / console.width -
      TV_CHIN * TV_INSET * CHIN_COVER
    );
  },
  SIZES,
  /** The composition's lengths, as shares of its width, for laying it out in container units. */
  OVERHANG,
  LONE_PHONE,
  TV_INSET,
  TV_BEZEL,
  TV_CHIN,
  CONSOLE,
} as const;
