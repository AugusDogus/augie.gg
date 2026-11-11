import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_APP_TITLE, SITE_URL } from "~/lib/site";

/** A share card's size: what link previews ask for. */
export const CARD_SIZE = { width: 1200, height: 630 };

// Literal paths keep the build's file tracing to these three assets.
const [backdrop, display, text] = await Promise.all([
  readFile(join(process.cwd(), "src/assets/card-backdrop.jpg")),
  readFile(join(process.cwd(), "src/assets/fonts/og/inter-display-600.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/og/inter-text-400.ttf")),
]);

/**
 * What a project's card is drawn on: the site's own background at a card's
 * size, the painting dimmed and faded into the blurred backdrop under the
 * scrim, as scripts/og-video.tsx takes it from the built site.
 */
export const CARD_BACKDROP = backdrop;

/**
 * A card's video, as metadata names it. Its address is in full: unlike an
 * image's, a video's is not resolved against the metadata's base.
 */
export function cardVideo(href: string) {
  const url = new URL(href, SITE_URL).href;
  return { url, secureUrl: url, type: "video/mp4", ...CARD_SIZE };
}

export const CARD_FONTS = [
  { name: "Inter Display", data: display, weight: 600 as const },
  { name: "Inter", data: text, weight: 400 as const },
];

/** The page's dark, under everything a card shows. */
export const CARD_GROUND = "#0a1317";

/** Where the painting sits on a card, as the site sets it in a window this wide: its right 1000px, a little above the top. */
export const CARD_ART = { left: 200, top: -49, width: 1000, height: 728 };

/** The site's background, filling the card. */
export function CardBackdrop() {
  return (
    // oxlint-disable-next-line nextjs/no-img-element -- ImageResponse renders plain elements, not next/image.
    <img
      alt=""
      src={`data:image/jpeg;base64,${CARD_BACKDROP.toString("base64")}`}
      width={CARD_SIZE.width}
      height={CARD_SIZE.height}
      style={{ position: "absolute", left: 0, top: 0 }}
    />
  );
}

/** The home card's words: the name and what he does, at the lower left. */
export function HomeCardWords() {
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        bottom: 92,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: "Inter Display",
          fontSize: 92,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: "#f2f6f7",
        }}
      >
        {DEFAULT_APP_TITLE}
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: "Inter",
          fontSize: 30,
          letterSpacing: "-0.01em",
          color: "#eef4f6b3",
        }}
      >
        Product engineer
      </div>
    </div>
  );
}
