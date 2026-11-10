/**
 * The painting's renderer, on its own thread: the WebGL context, the shader
 * compiles, the print bake, and every frame happen here, so the page's main
 * thread never waits on them. page.ts is the other end.
 */
import { createBackground } from "./background";
import { SurfaceStart } from "./flow-surface";
import type { FromRenderer, ToRenderer } from "./protocol";
import { decodeArtwork, type Artwork } from "./texture";

type Background = ReturnType<typeof createBackground>;

const send = (message: FromRenderer) => postMessage(message);

/** What the page last said, for a renderer still starting. */
const page = { width: 0, height: 0, playing: false, hidden: false };
let begun: {
  sky: OffscreenCanvas;
  coarse: boolean;
  start: SurfaceStart | null;
} | null = null;
/** The painting, decoding from the moment its file arrives. */
let artwork: Promise<Artwork> | null = null;
let creating = false;
let background: Background | null = null;

/** Builds the renderer once the canvases and the painting are both here, in either order. */
async function create() {
  if (creating || !begun || !artwork) return;
  creating = true;
  const { sky, coarse, start } = begun;
  try {
    const image = await artwork;
    background = createBackground(sky, image, {
      width: page.width,
      height: page.height,
      coarse,
      start,
      show: (live) => send({ type: "show", live }),
    });
    background.setHidden(page.hidden);
    background.setPlaying(page.playing);
    // The page swaps the poster for #sky on "ready": let the first frame reach it first.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => send({ type: "ready" })),
    );
  } catch (error) {
    // A no-op once a surface took it.
    start?.dispose();
    send({ type: "failed", reason: String(error) });
  }
}

addEventListener("message", (event: MessageEvent<ToRenderer>) => {
  const message = event.data;
  switch (message.type) {
    case "start":
      page.width = message.width;
      page.height = message.height;
      page.playing = message.playing;
      page.hidden = message.hidden;
      begun = {
        sky: message.sky,
        coarse: message.coarse,
        start: SurfaceStart.begin(message.surface),
      };
      void create();
      return;
    case "artwork":
      artwork = decodeArtwork(message.file);
      // create() reports a failed decode; this only keeps the rejection
      // handled while the canvases are still to come.
      artwork.catch(() => undefined);
      void create();
      return;
    case "resize":
      page.width = message.width;
      page.height = message.height;
      background?.resize(message.width, message.height);
      return;
    case "pointer":
      background?.[message.phase](message.sample);
      return;
    case "cancel":
      background?.cancel();
      return;
    case "leave":
      background?.leave();
      return;
    case "playing":
      page.playing = message.value;
      background?.setPlaying(message.value);
      return;
    case "hidden":
      page.hidden = message.value;
      background?.setHidden(message.value);
      return;
    case "cheer":
      background?.cheer();
      return;
    case "shown":
      background?.shown(message.live);
      return;
    default:
      message satisfies never;
  }
});
