import { FAR, Haze, NEAR, OCCLUDERS, RIM } from "./art-maps";
import { POD, PREROLL, Pod } from "./pod";
import { FlightRenderer } from "./renderer";
import * as shaders from "./shaders";
import { Specks } from "./specks";
import { STREAM_IDS, STREAMS } from "./streams";
import { canvas2d } from "./texture";
import { ART_HEIGHT, ART_WIDTH } from "./viewport";
import { WHALE_INDICES } from "./whale-body";

const round = (values: ArrayLike<number>) =>
  Array.from(values, (value) => Math.round(value * 1000) / 1000);

/**
 * Fingerprints the model, shader, and speck inputs of the t=0 frame.
 * flight-poster.css records the key of the frame it embeds. Changes to the
 * print bake (texture.ts) or the speck painter need a manual recapture.
 */
export function posterKey() {
  const pod = new Pod(Haze.flat(0.5, 0.5, 0.5));
  const sky = pod.write();
  const input = JSON.stringify({
    shaders,
    model: { STREAMS, POD, PREROLL, OCCLUDERS, NEAR, FAR, RIM },
    vertices: round(sky.vertices),
    whales: sky.whales.map((whale) =>
      round([...whale.tone, ...whale.look, ...whale.gate]),
    ),
    indices: Array.from(WHALE_INDICES),
    streams: STREAM_IDS.map((id) => {
      const frame = sky.streams[id],
        uniforms = pod.streams[id].uniforms;
      return [frame.clock, frame.bodies, frame.wakes, uniforms.beads].map(
        round,
      );
    }),
    specks: new Specks().points,
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++)
    hash = Math.imul(hash ^ input.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Renders an art-space frame after `seconds` of motion, before viewport scaling and feathering. */
export async function captureFrame(image: HTMLImageElement, seconds = 0) {
  const renderer = FlightRenderer.create(image);
  try {
    if (!renderer.accelerated)
      throw new Error(
        "Frame capture needs WebGL. The existing poster was not changed.",
      );
    const idle = { x: 0.5, y: 0.5, active: false };
    for (let i = 0; i < Math.round(seconds * 60); i++)
      renderer.step(1 / 60, idle);
    const { canvas, context } = canvas2d(ART_WIDTH, ART_HEIGHT);
    renderer.paint(context);
    const url = canvas.toDataURL("image/png");
    canvas.width = 0;
    return url;
  } finally {
    renderer.dispose();
  }
}

declare global {
  interface Window {
    flight?: {
      capturePoster(): Promise<string>;
      captureFrame(seconds: number): Promise<string>;
      posterKey(): string;
    };
  }
}

/**
 * Development only: `await flight.capturePoster()` downloads flight-poster.png;
 * `flight.captureFrame(seconds)` returns a later frame as a PNG data URL.
 */
export function installFlightDebug(image: HTMLImageElement) {
  window.flight = {
    async capturePoster() {
      const url = await captureFrame(image);
      const link = document.createElement("a");
      link.href = url;
      link.download = "flight-poster.png";
      link.click();
      console.info(`Captured poster ${posterKey()}`);
      return url;
    },
    captureFrame: (seconds) => captureFrame(image, seconds),
    posterKey,
  };
}
