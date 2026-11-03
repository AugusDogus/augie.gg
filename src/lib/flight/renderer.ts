import { Haze, occluderMask } from "./art-maps";
import { Flow, type Pointer } from "./flow";
import { FlowSurface, SurfaceStart } from "./flow-surface";
import type { Sense } from "./instrument";
import { Pod, type SkyFrame } from "./pod";
import { Specks, drawSpecks } from "./specks";
import { Subjects, rigCells, rigMap } from "./subjects";
import {
  canvas2d,
  renderTexture,
  type Artwork,
  type PrintedArt,
} from "./texture";
import { ART_HEIGHT, ART_WIDTH, PAINT_ZOOM, toPainting } from "./viewport";
import { VERTEX_FLOATS, WHALE_OUTLINES, WHALE_VERTICES } from "./whale-body";

// The GL composite samples a 0.94 zoom about the centre; the fallback matches it.
const CROP = {
  ...toPainting(0, 0),
  width: ART_WIDTH * PAINT_ZOOM,
  height: ART_HEIGHT * PAINT_ZOOM,
};

/** Simulation plus painting in display-art units (1200x874), before viewport fit and feather. */
export class FlightRenderer {
  readonly flow = new Flow();
  readonly specks = new Specks();
  elapsed = 0;
  private overlay: HTMLCanvasElement | null = null;

  private constructor(
    private print: PrintedArt,
    private mask: Uint8Array,
    readonly pod: Pod,
    private surface: FlowSurface | null,
  ) {}

  /**
   * `onRestore` runs after a lost GPU context is rebuilt, so a paused frame can
   * be redrawn. `start` (begun first if not passed) compiles the shaders while
   * the print bakes.
   */
  static create(
    art: Artwork,
    onRestore = () => {},
    start = SurfaceStart.begin(),
  ) {
    try {
      const print = renderTexture(art);
      const mask = occluderMask(print.sample);
      const pod = new Pod(Haze.fromSample(print.sample), new Subjects());
      const surface = FlowSurface.create(
        {
          print,
          image: art.bitmap,
          cells: rigCells(print.cells, rigMap(print.sample)),
          mask,
          streams: pod.streams,
          vertices: pod.write().vertices,
        },
        onRestore,
        start,
      );
      return new FlightRenderer(print, mask, pod, surface);
    } finally {
      // A no-op once the surface took it; otherwise a failed bake would strand the context.
      start?.dispose();
    }
  }

  get accelerated() {
    return this.surface !== null;
  }

  /** `pointer` drives the comb and specks; `sense` drives the pod, currents, and painted subjects. */
  step(dt: number, sense: Sense, pointer: Pointer) {
    this.elapsed += dt;
    this.flow.step(dt, pointer);
    this.specks.step(dt, this.elapsed, pointer);
    this.pod.step(dt, sense);
  }

  paint(context: CanvasRenderingContext2D) {
    const sky = this.pod.write();
    const scene = this.surface?.render(this.elapsed, this.flow.brushes, sky);
    if (scene) context.drawImage(scene, 0, 0, ART_WIDTH, ART_HEIGHT);
    else this.paintFallback(context, sky);
    // Specks wrap at the edges; keep their overhang off the feathered backdrop.
    context.save();
    context.beginPath();
    context.rect(0, 0, ART_WIDTH, ART_HEIGHT);
    context.clip();
    drawSpecks(context, this.specks.points);
    context.restore();
  }

  /** Printed art and flat near-layer whale silhouettes, without currents, wind, or brush. */
  private paintFallback(context: CanvasRenderingContext2D, sky: SkyFrame) {
    const { x, y, width, height } = CROP;
    context.drawImage(
      this.print.canvas,
      x,
      y,
      width,
      height,
      0,
      0,
      ART_WIDTH,
      ART_HEIGHT,
    );
    context.save();
    context.beginPath();
    context.rect(0, 0, ART_WIDTH, ART_HEIGHT);
    context.clip();
    const inverse = 1 / PAINT_ZOOM;
    context.transform(
      inverse,
      0,
      0,
      inverse,
      (ART_WIDTH / 2) * (1 - inverse),
      (ART_HEIGHT / 2) * (1 - inverse),
    );
    for (const whale of sky.whales) {
      // Only whales behind the near layer alone; the overlay below has no other layers.
      const [near = 0, wing = 0, puffs = 0] = whale.behind;
      if (near !== 1 || wing !== 0 || puffs !== 0) continue;
      // Without per-vertex alpha, fade the whole whale as its nose clears the gate.
      let nose = -Infinity;
      for (let i = 0; i < WHALE_VERTICES; i++)
        nose = Math.max(
          nose,
          sky.vertices[(whale.first + i) * VERTEX_FLOATS + 3] ?? -Infinity,
        );
      const [from = 0, to = 1] = whale.gate;
      const gate = Math.min(1, Math.max(0, (nose - from) / (to - from)));
      const opacity = (whale.look[0] ?? 0) * gate * gate * (3 - 2 * gate);
      if (opacity <= 0) continue;
      const [r = 0, g = 0, b = 0] = whale.tone;
      context.globalAlpha = opacity;
      context.fillStyle = `rgb(${r * 255},${g * 255},${b * 255})`;
      for (const outline of WHALE_OUTLINES) {
        context.beginPath();
        for (const index of outline) {
          const offset = (whale.first + index) * VERTEX_FLOATS;
          context.lineTo(
            sky.vertices[offset] ?? 0,
            sky.vertices[offset + 1] ?? 0,
          );
        }
        context.fill();
      }
    }
    context.restore();
    context.drawImage(
      this.occluders(),
      x,
      y,
      width,
      height,
      0,
      0,
      ART_WIDTH,
      ART_HEIGHT,
    );
  }

  /** The print, kept only where painted subjects sit in front of the whales. */
  private occluders() {
    if (this.overlay) return this.overlay;
    const { canvas: matte, context: matteContext } = canvas2d(600, 437);
    const alpha = matteContext.createImageData(600, 437);
    // The near layer is the red plane of the RGB mask.
    for (let i = 0; i < 600 * 437; i++)
      alpha.data[i * 4 + 3] = this.mask[i * 3] ?? 0;
    matteContext.putImageData(alpha, 0, 0);
    const { canvas, context } = canvas2d(ART_WIDTH, ART_HEIGHT);
    context.drawImage(matte, 0, 0, ART_WIDTH, ART_HEIGHT);
    context.globalCompositeOperation = "source-in";
    context.drawImage(this.print.canvas, 0, 0);
    matte.width = 0;
    this.overlay = canvas;
    return canvas;
  }

  dispose() {
    this.surface?.dispose();
    this.surface = null;
    this.print.canvas.width = 0;
    if (this.overlay) this.overlay.width = 0;
  }
}
