/**
 * Renders public/og-video.mp4, the video a link to the site previews with:
 * the home card, with the painting playing behind its words for one pass of
 * the mother and calf, which loops (src/lib/flight/pass.ts). The painting
 * sits in the site's own background, taken from the built site. Its first
 * frame becomes the card itself, src/app/opengraph-image.jpg, and without
 * the words the backdrop of every project's card,
 * src/assets/card-backdrop.jpg.
 * Usage: bun run build && CHROME_PATH=<chrome or chromium binary> bun run og:video
 * Needs ffmpeg on the PATH.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { chromium, type Browser } from "playwright-core";
import sharp from "sharp";
import { Pass } from "../src/lib/flight/pass";
import { ART_HEIGHT, ART_WIDTH } from "../src/lib/flight/viewport";
import { OgVideo } from "../src/lib/og-video";
import {
  CARD_ART,
  CARD_FONTS,
  CARD_SIZE,
  HomeCardWords,
} from "../src/lib/share-card";

const ROOT = new URL("../", import.meta.url);
const PORT = 3949;
const SITE_PORT = 3948;
const READY_MS = 30_000;
/**
 * The window the site is looked at through: the card's width, and as tall as
 * the painting stands on a card, of which the card shows a band.
 */
const VIEW = { width: CARD_SIZE.width, height: CARD_ART.height };
/** How the site dims the painting (globals.css, `#sky`). */
const DIM = { brightness: 0.76, saturate: 0.8 };
/** A frame takes about a tenth of a second to draw in software. */
const RENDER_MS = 600_000;

const executablePath = process.env.CHROME_PATH;
if (!executablePath)
  throw new Error(
    "Set CHROME_PATH to a Chrome or Chromium binary to draw the painting with. Nothing was modified.",
  );
const ffmpeg = Bun.which("ffmpeg");
if (ffmpeg === null)
  throw new Error(
    "ffmpeg is not on the PATH, and it encodes the video. Install it and run this again. Nothing was modified.",
  );
if (!(await Bun.file(new URL(".next/BUILD_ID", ROOT)).exists()))
  throw new Error(
    "There is no production build to take the site's background from. Run `bun run build` first. Nothing was modified.",
  );
const dim = `filter: brightness(${DIM.brightness}) saturate(${DIM.saturate})`;
if (
  !(await Bun.file(new URL("src/styles/globals.css", ROOT)).text()).includes(
    dim,
  )
)
  throw new Error(
    `src/styles/globals.css no longer dims the painting with \`${dim}\`. Set DIM in this script to what it uses now. Nothing was modified.`,
  );

const { FPS } = OgVideo;
const frames = Pass.frames(Pass.find(), FPS, OgVideo.DISSOLVE_SECONDS);
/**
 * The frames as they are drawn, in the parts the video orders anew: it opens
 * mid-pass, on the site's own opening, so the pass's two ends meet inside it.
 */
const PARTS = [
  { name: "head", end: frames.dissolve },
  { name: "early", end: frames.opening },
  { name: "late", end: frames.pass },
  { name: "tail", end: frames.pass + frames.dissolve },
] as const;
type Part = (typeof PARTS)[number]["name"];

const built = await Bun.build({
  entrypoints: [new URL("scripts/og-video.page.ts", ROOT).pathname],
  target: "browser",
});
const [script] = built.outputs;
if (!built.success || script === undefined)
  throw new Error(
    `The page that draws the painting did not build: ${built.logs.map((log) => log.message).join("; ")}. Nothing was modified.`,
  );

const work = await mkdtemp(join(tmpdir(), "og-video-"));
const file = (part: Part) => join(work, `${part}.mkv`);
/** Keeps a part's frames as they arrive, exactly, at a fraction of their size. */
const record = (part: Part) => ({
  part,
  ffmpeg: Bun.spawn(
    [
      ffmpeg,
      ...["-v", "error", "-f", "rawvideo", "-pixel_format", "rgba"],
      ...["-video_size", `${ART_WIDTH}x${ART_HEIGHT}`, "-framerate", `${FPS}`],
      ...["-i", "pipe:0", "-c:v", "libx264rgb", "-qp", "0"],
      ...["-preset", "ultrafast", file(part)],
    ],
    { stdin: "pipe", stdout: "inherit", stderr: "inherit" },
  ),
});
let recording: ReturnType<typeof record> | null = null;
async function finish() {
  if (recording === null) return;
  const { part, ffmpeg: recorder } = recording;
  recording = null;
  await recorder.stdin.end();
  if ((await recorder.exited) !== 0)
    throw new Error(
      `ffmpeg could not keep the ${part} frames (exit ${recorder.exitCode}); its own message is above. Nothing was modified.`,
    );
}
/** The site's background in the layers the painting sits between, and the painting's own edge. */
const LAYERS = {
  /** The blurred backdrop, under the painting. */
  under: join(work, "under.png"),
  /** The scrim, over it. */
  scrim: join(work, "scrim.png"),
  /** How much of the painting shows at each pixel: it fades in from its left edge. */
  feather: join(work, "feather.png"),
};
/** Takes LAYERS from the built site's home page, with everything but its background hidden. */
async function siteLayers(browser: Browser) {
  const site = Bun.spawn(
    [
      new URL("node_modules/.bin/next", ROOT).pathname,
      ...["start", "-p", `${SITE_PORT}`],
    ],
    { cwd: ROOT.pathname, stdout: "ignore", stderr: "inherit" },
  );
  try {
    const home = `http://localhost:${SITE_PORT}/`;
    const deadline = Date.now() + READY_MS;
    for (;;) {
      const ready = await fetch(home).then(
        (response) => response.ok,
        () => false,
      );
      if (ready) break;
      if (Date.now() > deadline)
        throw new Error(
          `The production server did not answer at ${home} within ${READY_MS / 1000}s. Is port ${SITE_PORT} taken? Nothing was modified.`,
        );
      await Bun.sleep(250);
    }
    // Reduced motion holds the painting on its first frame.
    const context = await browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const tab = await context.newPage();
    await tab.goto(home, { waitUntil: "load" });
    await tab.waitForFunction(
      () =>
        document.querySelector(".artwork")?.getAttribute("data-ready") ===
        "true",
    );
    const hide = (selector: string) =>
      `${selector} { display: none !important }`;
    const background =
      "body > :not(.artwork) { visibility: hidden !important }";
    const clear = "html, body { background: transparent !important }";
    const painting = hide(".artwork canvas, .artwork-poster");
    const shoot = async (css: string[], path: string) => {
      const style = await tab.addStyleTag({
        content: [background, ...css].join(" "),
      });
      await tab.screenshot({ path, omitBackground: css.includes(clear) });
      await style.evaluate((node) => node.parentNode?.removeChild(node));
    };
    await shoot([painting, hide(".artwork::after")], LAYERS.under);
    await shoot([clear, painting, hide(".artwork::before")], LAYERS.scrim);
    const alone = join(work, "painting.png");
    await shoot(
      [
        clear,
        hide(".artwork::before, .artwork::after"),
        hide(".artwork-poster"),
      ],
      alone,
    );
    await sharp(alone).extractChannel("alpha").toFile(LAYERS.feather);
    await context.close();
  } finally {
    site.kill();
  }
}
let posted = 0;
const finished = Promise.withResolvers<void>();
const server = Bun.serve({
  port: PORT,
  // The browser keeps spare connections open; one closed for sitting idle
  // fails the frame that is next posted on it.
  idleTimeout: 0,
  error: (error) => new Response(String(error), { status: 500 }),
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const frame = /^\/frame\/(\d+)$/.exec(pathname)?.[1];
    if (frame !== undefined) {
      const part = PARTS.find(({ end }) => posted < end)?.name;
      if (Number(frame) !== posted || part === undefined)
        return new Response(`Frame ${posted} is due next, not ${frame}.`, {
          status: 409,
        });
      posted++;
      if (recording?.part !== part) {
        await finish();
        recording = record(part);
      }
      await recording.ffmpeg.stdin.write(await request.arrayBuffer());
      await recording.ffmpeg.stdin.flush();
      return new Response("Saved.");
    }
    switch (pathname) {
      case "/":
        return new Response(
          '<!doctype html><script type="module" src="/page.js"></script>',
          { headers: { "Content-Type": "text/html" } },
        );
      case "/page.js":
        return new Response(script, {
          headers: { "Content-Type": "text/javascript" },
        });
      case "/painting.jpg":
        return new Response(
          Bun.file(new URL("public/flight4cover_redux_spread.jpg", ROOT)),
        );
      case "/done":
        finished.resolve();
        return new Response("Done.");
      case "/failed":
        finished.reject(
          new Error(
            `The painting stopped drawing: ${await request.text()} Nothing was modified.`,
          ),
        );
        return new Response("Noted.");
      default:
        return new Response("Nothing here.", { status: 404 });
    }
  },
});
try {
  // Software rendering, so every machine draws the same frames.
  const browser = await chromium.launch({
    executablePath,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    await siteLayers(browser);
    const tab = await browser.newPage();
    const plan = new URLSearchParams({
      skip: `${frames.skip}`,
      pass: `${frames.pass}`,
      dissolve: `${frames.dissolve}`,
      fade: `${Math.round(OgVideo.FAR_FADE_SECONDS * FPS)}`,
      fps: `${FPS}`,
    });
    await tab.goto(`http://localhost:${PORT}/?${plan}`);
    const timeout = setTimeout(
      () =>
        finished.reject(
          new Error(
            `The pass's ${frames.pass + frames.dissolve} frames were not drawn within ${RENDER_MS / 1000}s. Nothing was modified.`,
          ),
        ),
      RENDER_MS,
    );
    try {
      await finished.promise;
    } finally {
      clearTimeout(timeout);
    }
  } finally {
    await browser.close();
  }
  await finish();

  // What the card lays over its background, on nothing.
  const words = join(work, "words.png");
  await Bun.write(
    words,
    await new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <HomeCardWords />
      </div>,
      { ...CARD_SIZE, fonts: CARD_FONTS },
    ).arrayBuffer(),
  );

  /** Runs ffmpeg over the parts, the words and the layers, through `filter` to `[out]`. */
  const draw = async (filter: string[], output: string[]) => {
    const run = Bun.spawn(
      [
        ffmpeg,
        ...["-v", "error", "-i", file("late"), "-i", file("tail")],
        ...["-i", file("head"), "-i", file("early"), "-i", words],
        // The backdrop is under every frame, so it runs as long as they do.
        ...["-loop", "1", "-framerate", `${FPS}`, "-i", LAYERS.under],
        ...["-i", LAYERS.feather, "-i", LAYERS.scrim],
        ...["-filter_complex", filter.join(";"), "-map", "[out]", ...output],
      ],
      { stdout: "inherit", stderr: "inherit" },
    );
    if ((await run.exited) !== 0)
      throw new Error(
        `ffmpeg could not write ${output.at(-1)} (exit ${run.exitCode}); its own message is above. Nothing was modified.`,
      );
  };
  // CSS's saturate() as a matrix over red, green and blue, under its brightness().
  const { brightness: b, saturate: t } = DIM;
  const mix = [
    ["rr", 0.213 + 0.787 * t, "rg", 0.715 - 0.715 * t, "rb", 0.072 - 0.072 * t],
    ["gr", 0.213 - 0.213 * t, "gg", 0.715 + 0.285 * t, "gb", 0.072 - 0.072 * t],
    ["br", 0.213 - 0.213 * t, "bg", 0.715 - 0.715 * t, "bb", 0.072 + 0.928 * t],
  ]
    .flat()
    .map((part) =>
      typeof part === "string" ? `${part}=` : `${(part * b).toFixed(4)}:`,
    )
    .join("")
    .slice(0, -1);
  /**
   * Painting frames `[from]` as the site shows them, to `[backdrop]`: scaled
   * and dimmed, faded in from the left over the blurred backdrop, under the
   * scrim, and cut to the card's band of the window.
   */
  const sited = (from: string) => [
    `${from}scale=${CARD_ART.width}:${CARD_ART.height}:flags=bilinear,colorchannelmixer=${mix},pad=${VIEW.width}:${VIEW.height}:${CARD_ART.left}:0,format=rgba[art]`,
    `[6:v]format=gray[feather]`,
    `[art][feather]alphamerge[shown]`,
    `[5:v][shown]overlay=shortest=1[lit]`,
    `[lit][7:v]overlay,crop=${CARD_SIZE.width}:${CARD_SIZE.height}:0:${-CARD_ART.top}[backdrop]`,
  ];

  // From the opening to the pass's end; then the frames past the end
  // dissolving into its first, while neither the mother nor the calf shows;
  // then on to the opening again.
  const video = join(work, "og-video.mp4");
  await draw(
    [
      `[1:v][2:v]blend=all_expr='A+(B-A)*(N+1)/${frames.dissolve + 1}'[seam]`,
      `[0:v][seam][3:v]concat=n=3:v=1[loop]`,
      ...sited("[loop]"),
      `[backdrop][4:v]overlay,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[out]`,
    ],
    [
      // Level 4.0 keeps it within what a phone's decoder takes.
      ...["-c:v", "libx264", "-profile:v", "high", "-level:v", "4.0"],
      ...["-preset", "veryslow", "-crf", "28"],
      // One key frame: the print's grain is still, so every later frame
      // carries it on from the first, where a new key frame would redraw it
      // and visibly shimmer.
      ...["-x264-params", "keyint=infinite"],
      ...["-colorspace", "bt709", "-color_primaries", "bt709"],
      ...["-color_trc", "bt709"],
      // The index first, so a preview can start playing before the file ends.
      ...["-movflags", "+faststart", "-an", video],
    ],
  );
  // The card is the video's first frame, so a preview that shows the card
  // while the video loads does not jump when it starts. The same frame
  // without the words is what every project's card is drawn on.
  const jpeg = ["-frames:v", "1", "-c:v", "mjpeg", "-q:v", "2"];
  const first = sited("[0:v]trim=end_frame=1,");
  const still = join(work, "opengraph-image.jpg");
  await draw(
    [...first, `[backdrop][4:v]overlay,format=yuvj444p[out]`],
    [...jpeg, still],
  );
  const backdrop = join(work, "card-backdrop.jpg");
  await draw([...first, `[backdrop]format=yuvj444p[out]`], [...jpeg, backdrop]);

  await Bun.write(new URL(OgVideo.BACKDROP, ROOT), Bun.file(backdrop));
  await Bun.write(new URL(OgVideo.FILE, ROOT), Bun.file(video));
  await Bun.write(new URL(OgVideo.STILL, ROOT), Bun.file(still));
  const kilobytes = (path: string) => Math.round(Bun.file(path).size / 1024);
  console.log(
    `Rendered ${OgVideo.FILE}: ${(frames.pass / FPS).toFixed(1)} s at ${FPS} fps, ${kilobytes(video)} KB. Its first frame is ${OgVideo.STILL}, ${kilobytes(still)} KB.`,
  );
} finally {
  await finish().catch(() => undefined);
  await server.stop(true);
  await rm(work, { recursive: true, force: true });
}
