import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

/** The painting at the right, fading into the page's dark at the left, where the words go. */
export function CardBackdrop() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        width: 1200,
        height: 630,
      }}
    >
      {/* oxlint-disable-next-line nextjs/no-img-element -- ImageResponse renders plain elements, not next/image. */}
      <img
        alt=""
        src={artSrc}
        width={1000}
        height={728}
        style={{ position: "absolute", right: 0, top: -49 }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          background:
            "linear-gradient(90deg, #060d11 17%, #060d11f0 26%, #060d11a6 48%, #060d1133 72%, #060d111a 100%)",
        }}
      />
    </div>
  );
}
