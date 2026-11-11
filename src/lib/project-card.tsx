import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GitMergeIcon } from "@phosphor-icons/react/dist/ssr";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import sharp from "sharp";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { monthYear } from "~/components/work/project-facts";
import { Share } from "~/components/work/share";
import { Showcase } from "~/components/work/showcase";
import type { Project } from "~/content/projects";
import {
  CARD_BACKDROP,
  CARD_FONTS,
  CARD_GROUND,
  CARD_SIZE,
  CardBackdrop,
} from "~/lib/share-card";
import { DEFAULT_APP_TITLE } from "~/lib/site";

/** Where a card's capture shows, in card px. */
export type CardFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
};

/** The card's left edge for words, and the gap they keep from the panel. */
const MARGIN = 72;
const GAP = 44;
/** The title: as large as fits its column, on two lines once one would set it under `wrap`. */
const TITLE = { max: 76, wrap: 48 };
/** The glass panel at the right: its inset, the border the capture keeps inside it, and the row under the capture. */
const PANEL = { right: 56, pad: 7, radius: 16, row: 56 };
/** A screen's width in the panel, and a phone's height. */
const SCREEN = { width: 606, radius: 9 };
const PHONE = { height: 470, radius: 24 };
const BLURB = { size: 25, leading: 1.45, lines: 6, measure: 560 };

// The site's text colours on dark glass (globals.css).
const FG = "#f2f6f7";
const FG_2 = "#eef4f6ad";
const FG_3 = "#eef4f682";

/** `owner/repo`, as a contribution is titled. */
const REPOSITORY = /^[\w.-]+\//;

/** The backdrop as the site's glass shows what is behind it: blurred, a little richer. */
const frosted = `data:image/jpeg;base64,${(
  await sharp(CARD_BACKDROP)
    .blur(20)
    .modulate({ saturation: 1.4 })
    .jpeg({ quality: 90 })
    .toBuffer()
).toString("base64")}`;

const measured = new Map<string, Promise<number>>();
/**
 * How wide a line of the title sets, in em: it is drawn once at 100px and
 * measured, so the size that fits is exact for these glyphs and this tracking.
 */
function width(line: string): Promise<number> {
  const known = measured.get(line);
  if (known !== undefined) return known;
  const measure = (async () => {
    const drawn = await new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <div
          style={{
            margin: 40,
            fontFamily: "Inter Display",
            fontSize: 100,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            whiteSpace: "nowrap",
          }}
        >
          {line}
        </div>
      </div>,
      { width: 4000, height: 240, fonts: CARD_FONTS },
    ).arrayBuffer();
    const { info } = await sharp(Buffer.from(drawn))
      .trim()
      .toBuffer({ resolveWithObject: true });
    return info.width / 100;
  })();
  measured.set(line, measure);
  return measure;
}

/**
 * The title's lines and the size they set at in a column `column` px wide:
 * one line, or two where one would be small, broken after a space, hyphen or
 * slash at the place that leaves the lines most alike. Never inside a word.
 */
async function fit(title: string, column: number) {
  const size = (em: number) => Math.min(TITLE.max, Math.floor(column / em));
  const whole = { lines: [title], size: size(await width(title)) };
  if (whole.size >= TITLE.wrap) return whole;
  let best = whole;
  for (const match of title.matchAll(/[\s/-]/g)) {
    const at = match.index + 1;
    const lines = [title.slice(0, at).trimEnd(), title.slice(at).trimStart()];
    if (lines.includes("")) continue;
    const widest = Math.max(...(await Promise.all(lines.map(width))));
    if (size(widest) > best.size) best = { lines, size: size(widest) };
  }
  return best;
}

/**
 * A capture cropped from its top to fill `frame`, at twice its size, as a
 * JPEG: the card's renderer cannot read the WebP the captures are kept in.
 */
async function picture(src: string, frame: CardFrame) {
  const file = await readFile(join(process.cwd(), "public", src));
  const jpeg = await sharp(file)
    .resize({
      width: frame.width * 2,
      height: frame.height * 2,
      fit: "cover",
      position: "top",
    })
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

/** The capture's box inside the panel, and the panel around it. */
function layout(project: Project) {
  const showcase = Showcase.of(project.media);
  if (showcase === null) return null;
  const cover = Showcase.cover(showcase);
  const phone = showcase.kind === "phone";
  const capture = phone
    ? {
        width: Math.round((PHONE.height * cover.width) / cover.height),
        height: PHONE.height,
        radius: PHONE.radius,
      }
    : {
        width: SCREEN.width,
        height: Math.round((SCREEN.width * cover.height) / cover.width),
        radius: SCREEN.radius,
      };
  const panel = {
    width: capture.width + 2 * PANEL.pad,
    height: PANEL.pad + capture.height + PANEL.row,
  };
  const left = CARD_SIZE.width - PANEL.right - panel.width;
  const top = Math.round((CARD_SIZE.height - panel.height) / 2);
  return {
    phone,
    cover,
    panel: { left, top, ...panel },
    frame: { left: left + PANEL.pad, top: top + PANEL.pad, ...capture },
  };
}

/** The site's status chip, at a card's scale. */
function Chip({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 30,
        padding: "0 13px 0 8px",
        borderRadius: 15,
        border: "1px solid #ffffff1a",
        background: "#ffffff0a",
        color: FG_2,
        fontFamily: "Inter",
        fontSize: 15,
      }}
    >
      {children}
    </div>
  );
}

function Status({ project }: { project: Project }) {
  const status = statusOf(project.labels);
  if (status !== null)
    return (
      <Chip>
        <div style={{ display: "flex", transform: "scale(1.15)" }}>
          <StatusIcon status={status} />
        </div>
        {STATUS_LABEL[status]}
      </Chip>
    );
  if (project.labels?.includes("oss"))
    return (
      <Chip>
        <GitMergeIcon size={16} color={FG_2} />
        Open source
      </Chip>
    );
  return null;
}

export const ProjectCard = {
  /** Where the project's lead capture shows on its card; null without one. */
  frame(project: Project): CardFrame | null {
    return layout(project)?.frame ?? null;
  },

  /**
   * A project's card, as the site shows the project: its name and blurb at
   * the left over the site's background, and its lead capture at the right
   * in the site's glass panel, with its status and when it began.
   */
  async draw(project: Project): Promise<ImageResponse> {
    const placed = layout(project);
    const still =
      placed === null ? null : await picture(placed.cover.src, placed.frame);
    const column =
      placed === null
        ? CARD_SIZE.width - 2 * MARGIN
        : placed.panel.left - MARGIN - GAP;
    const title = await fit(project.title, column);
    const owner = REPOSITORY.exec(project.title)?.[0].length ?? 0;
    const started = monthYear(project.date);
    let drawn = 0;
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
        {placed !== null && still !== null && (
          <div
            style={{
              position: "absolute",
              left: placed.panel.left,
              top: placed.panel.top,
              width: placed.panel.width,
              height: placed.panel.height,
              display: "flex",
              borderRadius: PANEL.radius,
              overflow: "hidden",
              boxShadow: "0 1px 2px #00000040, 0 24px 64px -16px #00000080",
            }}
          >
            {/* What the glass blurs: the backdrop, in register behind it. */}
            {/* oxlint-disable-next-line nextjs/no-img-element -- ImageResponse renders plain elements, not next/image. */}
            <img
              alt=""
              src={frosted}
              width={CARD_SIZE.width}
              height={CARD_SIZE.height}
              style={{
                position: "absolute",
                left: -placed.panel.left,
                top: -placed.panel.top,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: placed.panel.width,
                height: placed.panel.height,
                borderRadius: PANEL.radius,
                border: "1px solid #ffffff17",
                background: "linear-gradient(180deg, #16232acc, #0d171ce0)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: PANEL.pad,
                top: PANEL.pad,
                display: "flex",
                width: placed.frame.width,
                height: placed.frame.height,
                borderRadius: placed.frame.radius,
                overflow: "hidden",
                background: "#05090b",
                boxShadow: "0 0 0 1px #ffffff1f",
              }}
            >
              {/* oxlint-disable-next-line nextjs/no-img-element -- ImageResponse renders plain elements, not next/image. */}
              <img
                alt=""
                src={still}
                width={placed.frame.width}
                height={placed.frame.height}
              />
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: placed.panel.width,
                height: PANEL.row,
                padding: "0 20px 0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Status project={project} />
              {/* A phone's panel is too narrow for both. */}
              {started !== null && !placed.phone && (
                <div
                  style={{
                    marginLeft: "auto",
                    fontFamily: "Inter",
                    fontSize: 16,
                    color: FG_3,
                  }}
                >
                  {`Started ${started}`}
                </div>
              )}
            </div>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            left: MARGIN,
            top: 0,
            bottom: 0,
            width: column,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {title.lines.map((line) => {
            // A contribution's owner is quieter than its repository, as GitHub writes it.
            const dim = Math.max(0, Math.min(line.length, owner - drawn));
            drawn += line.length;
            return (
              <div
                key={line}
                style={{
                  display: "flex",
                  fontFamily: "Inter Display",
                  fontSize: title.size,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.08,
                  color: FG,
                  whiteSpace: "nowrap",
                }}
              >
                {dim > 0 && (
                  <span style={{ color: FG_3 }}>{line.slice(0, dim)}</span>
                )}
                {line.slice(dim)}
              </div>
            );
          })}
          <div
            style={{
              marginTop: 22,
              width: Math.min(column, BLURB.measure),
              fontFamily: "Inter",
              fontSize: BLURB.size,
              lineHeight: BLURB.leading,
              letterSpacing: "-0.01em",
              color: FG_2,
              display: "block",
              lineClamp: BLURB.lines,
              textOverflow: "ellipsis",
            }}
          >
            {Share.tagline(project)}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: MARGIN,
            bottom: 52,
            fontFamily: "Inter",
            fontSize: 23,
            letterSpacing: "-0.01em",
            color: FG_3,
          }}
        >
          {DEFAULT_APP_TITLE}
        </div>
      </div>,
      { ...CARD_SIZE, fonts: CARD_FONTS },
    );
  },
} as const;
