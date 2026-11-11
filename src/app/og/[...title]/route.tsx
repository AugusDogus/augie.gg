import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { Share } from "~/components/work/share";
import { Showcase } from "~/components/work/showcase";
import { projects } from "~/content/projects";
import {
  CARD_FONTS,
  CARD_GROUND,
  CARD_SIZE,
  CardBackdrop,
} from "~/lib/share-card";
import { DEFAULT_APP_TITLE } from "~/lib/site";

type Props = { params: Promise<{ title: string[] }> };

/** Every project's card is drawn at build; no other path has one. */
export const dynamicParams = false;
export function generateStaticParams() {
  return projects.map((project) => ({ title: Share.segments(project.title) }));
}

/** The capture's box on the card: a screen at the right, or a phone. */
const SCREEN = { width: 560, height: 350 };
const PHONE = { width: 236, height: 500 };

/** Long titles step down a size, so they keep to the left column. */
function titleSize(title: string) {
  return title.length <= 12 ? 80 : title.length <= 20 ? 58 : 44;
}

/**
 * A capture cropped from its top to fill `box`, at twice its size, as a JPEG:
 * the card's renderer cannot read the WebP the captures are kept in.
 */
async function crop(src: string, box: { width: number; height: number }) {
  const file = await readFile(join(process.cwd(), "public", src));
  const jpeg = await sharp(file)
    .resize({
      width: box.width * 2,
      height: box.height * 2,
      fit: "cover",
      position: "top",
    })
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

/** A project's card: its name and blurb beside its lead capture, over the painting. */
export async function GET(_request: Request, { params }: Props) {
  const project = Share.find((await params).title);
  if (project === undefined)
    return new Response("No such project.", { status: 404 });
  const showcase = Showcase.of(project.media);
  const box = showcase?.kind === "phone" ? PHONE : SCREEN;
  const picture =
    showcase === null ? null : await crop(Showcase.cover(showcase).src, box);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: CARD_GROUND,
      }}
    >
      <CardBackdrop />
      {picture !== null && (
        <div
          style={{
            position: "absolute",
            right: 64,
            top: (CARD_SIZE.height - box.height) / 2,
            display: "flex",
            width: box.width,
            height: box.height,
            borderRadius: showcase?.kind === "phone" ? 28 : 12,
            overflow: "hidden",
            border: "1px solid #ffffff33",
            boxShadow: "0 24px 64px #000000b3",
            background: "#05090b",
          }}
        >
          {/* oxlint-disable-next-line nextjs/no-img-element -- ImageResponse renders plain elements, not next/image. */}
          <img alt="" src={picture} width={box.width} height={box.height} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 0,
          bottom: 0,
          width: picture === null ? 900 : 460,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Inter Display",
            fontSize: titleSize(project.title),
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            color: "#f2f6f7",
            wordBreak: "break-word",
          }}
        >
          {project.title}
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: "Inter",
            fontSize: 27,
            lineHeight: 1.4,
            letterSpacing: "-0.01em",
            color: "#eef4f6c7",
            display: "block",
            lineClamp: 4,
          }}
        >
          {Share.description(project)}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 56,
          fontFamily: "Inter",
          fontSize: 24,
          letterSpacing: "-0.01em",
          color: "#eef4f68c",
        }}
      >
        {DEFAULT_APP_TITLE}
      </div>
    </div>,
    { ...CARD_SIZE, fonts: CARD_FONTS },
  );
}
