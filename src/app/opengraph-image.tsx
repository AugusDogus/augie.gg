import { ImageResponse } from "next/og";
import { CARD_FONTS, CARD_SIZE, CardBackdrop } from "~/lib/share-card";

export const alt =
  "Augie Luebbers, product engineer, over Kazu Kibuishi’s painting Flight";
export const size = CARD_SIZE;
export const contentType = "image/png";

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
      <CardBackdrop />
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
    { ...size, fonts: CARD_FONTS },
  );
}
