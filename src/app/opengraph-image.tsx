import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Augie Luebbers, product engineer, over Kazu Kibuishi’s painting Flight";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Literal paths keep the build's file tracing to these three assets.
const [art, display, text] = await Promise.all([
  readFile(join(process.cwd(), "public/flight4cover_redux_spread.jpg")),
  readFile(join(process.cwd(), "src/assets/fonts/og/inter-display-600.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/og/inter-text-400.ttf")),
]);
const artSrc = `data:image/jpeg;base64,${art.toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0a1317",
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
            "linear-gradient(90deg, #060d11 0%, #060d11f0 26%, #060d11a6 48%, #060d1133 72%, #060d111a 100%)",
        }}
      />
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
          Augie Luebbers
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
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter Display", data: display, weight: 600 },
        { name: "Inter", data: text, weight: 400 },
      ],
    },
  );
}
