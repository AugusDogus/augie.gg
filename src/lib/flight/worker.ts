/**
 * The painting's renderer, on its own thread: the WebGL context, the shader
 * compiles, the print bake, and every frame happen here, so the page's main
 * thread never waits on them. page.ts is the other end.
 */
import { createBackground } from "./background";
import { SurfaceStart } from "./flow-surface";
import type { FromRenderer, ToRenderer } from "./protocol";
import { decodeArtwork } from "./texture";

type Background = ReturnType<typeof createBackground>;

const send = (message: FromRenderer) => postMessage(message);

/** What the page last said, for a renderer still starting. */
const page = { width: 0, height: 0, playing: false, hidden: false };
let begun: {
  sky: OffscreenCanvas;
  coarse: boolean;
  start: SurfaceStart | null;
} | null = null;
let background: Background | null = null;

async function create(file: Blob) {
  if (!begun) {
    send({
      type: "failed",
      reason:
        "The renderer received the artwork before its canvases. The poster stays; reload to retry.",
    });
    return;
  }
  const { sky, coarse, start } = begun;
  try {
    const image = await decodeArtwork(file);
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
      return;
    case "artwork":
      void create(message.file);
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
    case "shown":
      background?.shown(message.live);
      return;
    default:
      message satisfies never;
  }
});
