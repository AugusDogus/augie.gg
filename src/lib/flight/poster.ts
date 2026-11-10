import { FAR, Haze, NEAR, OCCLUDERS, RIM } from "./art-maps";
import { INK } from "./ink";
import { Instrument, STILL } from "./instrument";
import { POD, PREROLL, Pod } from "./pod";
import { FlightRenderer } from "./renderer";
import * as shaders from "./shaders";
import { Specks } from "./specks";
import { STREAM_IDS, STREAMS } from "./streams";
import { SUBJECTS, Subjects } from "./subjects";
import { context2d, loadArtwork, type Artwork } from "./texture";
import { ART_HEIGHT, ART_WIDTH, PAINT_ZOOM } from "./viewport";
import { WHALE_INDICES } from "./whale-body";

/** An art-size canvas on the page: only a page canvas has toDataURL. */
function pageCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = ART_WIDTH;
  canvas.height = ART_HEIGHT;
  return { canvas, context: context2d(canvas) };
}

const round = (values: ArrayLike<number>) =>
  Array.from(values, (value) => Math.round(value * 1000) / 1000);

/**
 * Fingerprints the model, shader, and speck inputs of the t=0 frame.
 * flight-poster.css records the key of the frame it embeds. Changes to the
 * print bake (texture.ts) or the speck painter need a manual recapture.
 */
export function posterKey() {
  const pod = new Pod(Haze.flat(0.5, 0.5, 0.5), new Subjects());
  const sky = pod.write();
  const input = JSON.stringify({
    shaders,
    model: { STREAMS, POD, PREROLL, OCCLUDERS, NEAR, FAR, RIM, SUBJECTS, INK },
    vertices: round(sky.vertices),
    rig: round(sky.rig),
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
export async function captureFrame(image: Artwork, seconds = 0) {
  const renderer = FlightRenderer.create(image);
  try {
    if (!renderer.accelerated)
      throw new Error(
        "Frame capture needs WebGL. The existing poster was not changed.",
      );
    const idle = { x: 0.5, y: 0.5, active: false };
    for (let i = 0; i < Math.round(seconds * 60); i++)
      renderer.step(1 / 60, STILL, idle);
    const { canvas, context } = pageCanvas();
    renderer.paint(context);
    const url = canvas.toDataURL("image/png");
    canvas.width = 0;
    return url;
  } finally {
    renderer.dispose();
  }
}

/** A scripted pointer event at `at` seconds, in painting px. */
export type ScriptEvent = {
  at: number;
  kind: "move" | "down" | "up";
  x: number;
  y: number;
};

/**
 * Development only: replays pointer events through the real Instrument on the
 * fixed clock and returns art-space frames at the `shots` times, so
 * interactions can be judged frame by frame.
 */
export async function captureScript(
  image: Artwork,
  events: readonly ScriptEvent[],
  shots: readonly number[],
) {
  const renderer = FlightRenderer.create(image);
  const instrument = new Instrument();
  const frames: string[] = [];
  try {
    if (!renderer.accelerated) throw new Error("Scripted capture needs WebGL.");
    const { canvas, context } = pageCanvas();
    const toArt = (x: number, y: number) => ({
      x: ((x - ART_WIDTH / 2) / PAINT_ZOOM + ART_WIDTH / 2) / ART_WIDTH,
      y: ((y - ART_HEIGHT / 2) / PAINT_ZOOM + ART_HEIGHT / 2) / ART_HEIGHT,
    });
    const end = Math.max(...shots);
    let next = 0;
    for (let tick = 1; tick / 60 <= end + 1e-9; tick++) {
      const time = tick / 60;
      for (const event of events) {
        // Events at or before 0 replay on the first tick.
        if (event.at > time || (tick > 1 && event.at <= (tick - 1) / 60))
          continue;
        const art = toArt(event.x, event.y);
        const ms = event.at * 1000;
        if (event.kind === "move")
          instrument.move(art.x, art.y, "mouse", false, ms);
        else if (event.kind === "down")
          instrument.down(art.x, art.y, "mouse", false, event.x, event.y, ms);
        else instrument.up(art.x, art.y, "mouse", event.x, event.y, ms);
      }
      renderer.step(1 / 60, instrument.frame(1 / 60), instrument.pointer);
      while ((shots[next] ?? Infinity) <= time + 1e-9) {
        renderer.paint(context);
        frames.push(canvas.toDataURL("image/png"));
        next++;
      }
    }
    canvas.width = 0;
    return frames;
  } finally {
    renderer.dispose();
  }
}

declare global {
  interface Window {
    flight?: {
      capturePoster(): Promise<string>;
      captureFrame(seconds: number): Promise<string>;
      captureScript(
        events: readonly ScriptEvent[],
        shots: readonly number[],
      ): Promise<string[]>;
      posterKey(): string;
    };
  }
}

/**
 * Development only: `await flight.capturePoster()` downloads flight-poster.png;
 * `flight.captureFrame(seconds)` returns a later frame as a PNG data URL.
 * These render on the page, apart from the worker, from the painting at `src`
 * decoded through an <img> on first use.
 */
export function installFlightDebug(src: string) {
  let loading: Promise<Artwork> | null = null;
  const artwork = () => (loading ??= loadArtwork(src));
  window.flight = {
    async capturePoster() {
      const url = await captureFrame(await artwork());
      const link = document.createElement("a");
      link.href = url;
      link.download = "flight-poster.png";
      link.click();
      console.info(`Captured poster ${posterKey()}`);
      return url;
    },
    captureFrame: async (seconds) => captureFrame(await artwork(), seconds),
    captureScript: async (events, shots) =>
      captureScript(await artwork(), events, shots),
    posterKey,
  };
}
