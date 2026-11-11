import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_APP_TITLE } from "~/lib/site";

/** What every share card is drawn on: the painting under a scrim, and the site's two faces. */
export const CARD_SIZE = { width: 1200, height: 630 };

// Literal paths keep the build's file tracing to these three assets.
const [art, display, text] = await Promise.all([
  readFile(join(process.cwd(), "public/flight4cover_redux_spread.jpg")),
  readFile(join(process.cwd(), "src/assets/fonts/og/inter-display-600.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/og/inter-text-400.ttf")),
]);
const artSrc = `data:image/jpeg;base64,${art.toString("base64")}`;

export const CARD_FONTS = [
  { name: "Inter Display", data: display, weight: 600 as const },
  { name: "Inter", data: text, weight: 400 as const },
];

/** The page's dark, under everything a card shows. */
export const CARD_GROUND = "#0a1317";

/** Where the painting sits on a card: its right 1000px, a little above the top. */
export const CARD_ART = { left: 200, top: -49, width: 1000, height: 728 };

const FILL = {
  position: "absolute",
  top: 0,
  left: 0,
  width: CARD_SIZE.width,
  height: CARD_SIZE.height,
} as const;

/** The dark the painting fades into at the left, where the words go. */
export function CardScrim() {
  return (
    <div
      style={{
        ...FILL,
        background:
          "linear-gradient(90deg, #060d11 17%, #060d11f0 26%, #060d11a6 48%, #060d1133 72%, #060d111a 100%)",
      }}
    />
  );
}

/** The painting at the right, under the scrim. */
export function CardBackdrop() {
  return (
    <div style={{ ...FILL, display: "flex" }}>
      {/* oxlint-disable-next-line nextjs/no-img-element -- ImageResponse renders plain elements, not next/image. */}
      <img
        alt=""
        src={artSrc}
        width={CARD_ART.width}
        height={CARD_ART.height}
        style={{ position: "absolute", left: CARD_ART.left, top: CARD_ART.top }}
      />
      <CardScrim />
    </div>
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
