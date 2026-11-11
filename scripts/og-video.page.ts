/**
 * The page scripts/og-video.tsx opens: it runs the painting on the site's own
 * renderer, on its fixed clock with no visitor, and posts back each frame of
 * the pass it is asked for.
 */
import { STILL } from "../src/lib/flight/instrument";
import { Pass } from "../src/lib/flight/pass";
import { FlightRenderer } from "../src/lib/flight/renderer";
import { context2d, loadArtwork } from "../src/lib/flight/texture";
import { ART_HEIGHT, ART_WIDTH } from "../src/lib/flight/viewport";

/** The simulation's step: the site's 60 fps. */
const STEP = 1 / 60;
const IDLE = { x: 0.5, y: 0.5, active: false };

type Plan = {
  /** Frames from t = 0 to the first one posted. */
  skip: number;
  pass: number;
  dissolve: number;
  /** Frames the far whale takes to come in and go out. */
  fade: number;
  fps: number;
};

async function render({ skip, pass, dissolve, fade, fps }: Plan) {
  const renderer = FlightRenderer.create(await loadArtwork("/painting.jpg"));
  try {
    if (!renderer.accelerated)
      throw new Error("This browser has no WebGL to run the painting with.");
    const canvas = document.createElement("canvas");
    canvas.width = ART_WIDTH;
    canvas.height = ART_HEIGHT;
    const context = context2d(canvas, true);
    const advance = (frames: number) => {
      for (let step = 0; step < frames * Math.round(1 / fps / STEP); step++)
        renderer.step(STEP, STILL, IDLE);
    };
    advance(skip);
    for (let frame = 0; frame < pass + dissolve; frame++) {
      if (frame > 0) advance(1);
      // The far whale alone keeps its own time, so it is out of sight where
      // the pass's end meets its start. Its next step sets this afresh.
      renderer.pod.far.opacity *= Pass.far({ pass, dissolve }, frame, fade);
      renderer.paint(context);
      // Raw pixels: the browser keeps every PNG it encodes, and runs out of
      // room for them a few hundred frames in.
      const saved = await fetch(`/frame/${frame}`, {
        method: "POST",
        body: context.getImageData(0, 0, ART_WIDTH, ART_HEIGHT).data,
      });
      if (!saved.ok)
        throw new Error(`Frame ${frame} was refused: ${await saved.text()}`);
    }
  } finally {
    renderer.dispose();
  }
}

const query = new URLSearchParams(location.search);
const number = (name: keyof Plan) => Number(query.get(name));
render({
  skip: number("skip"),
  pass: number("pass"),
  dissolve: number("dissolve"),
  fade: number("fade"),
  fps: number("fps"),
}).then(
  () => fetch("/done", { method: "POST" }),
  (error: unknown) => fetch("/failed", { method: "POST", body: String(error) }),
);
