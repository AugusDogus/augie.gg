import type { SurfaceStart } from "./flow-surface";
import { FramePolicy } from "./frame-policy";
import { Instrument, type PointerKind } from "./instrument";
import { FlightRenderer } from "./renderer";
import { context2d, type Artwork, type Canvas } from "./texture";
import { ART_HEIGHT, ART_WIDTH, FEATHER, fitArt } from "./viewport";

/** A pointer event as the page located it: x, y in display-art units, the rest as the event had them. */
export type PointerSample = {
  x: number;
  y: number;
  /** Off the art, or over the page's UI. */
  blocked: boolean;
  kind: PointerKind;
  clientX: number;
  clientY: number;
  buttons: number;
  timeStamp: number;
};

export type BackgroundOptions = {
  /** The canvas box in device px. */
  width: number;
  height: number;
  /** A coarse pointer: 30 fps. */
  coarse: boolean;
  /**
   * Whether the page should now show the WebGL canvas (live) or `canvas`.
   * Called whenever that changes, after the canvas to show holds its frame.
   */
  show: (live: boolean) => void;
  /** Begun before the image decoded, so shaders compile meanwhile. */
  start?: SurfaceStart | null;
};

/**
 * The painting's simulation and drawing, with no page of its own: it runs in
 * the worker, and the page sends sizes, pointers, and visibility. `canvas` is
 * #sky, for still frames; the WebGL canvas is the `start`'s.
 */
export function createBackground(
  canvas: Canvas,
  image: Artwork,
  {
    width: startWidth,
    height: startHeight,
    coarse,
    show,
    start,
  }: BackgroundOptions,
) {
  const context = context2d(canvas);
  const renderer = FlightRenderer.create(
    image,
    {
      // The lost context blanked the shown WebGL canvas; show the 2D frame now.
      lost: () => {
        if (presenting) draw();
      },
      // While paused, nothing else repaints the GL frame after a context restore.
      restored: () => {
        if (!playing) draw();
      },
    },
    start,
  );
  const policy = new FramePolicy(coarse || !renderer.accelerated ? 30 : 60);
  const instrument = new Instrument();
  // Gradients resolve against the transform at fill time, so one per edge suffices.
  const feathers = {
    wide: context.createLinearGradient(0, 0, FEATHER.wide, 0),
    tall: context.createLinearGradient(0, FEATHER.tall, 0, ART_HEIGHT),
  };
  feathers.wide.addColorStop(0, "black");
  feathers.wide.addColorStop(1, "transparent");
  feathers.tall.addColorStop(0, "transparent");
  feathers.tall.addColorStop(1, "black");
  let playing = false,
    hidden = false,
    presenting = false,
    frameId = 0,
    // The canvas box in device px, at most 1.5 per CSS px.
    width = 0,
    height = 0;

  /**
   * Animating frames go straight to the WebGL canvas. Still frames, and any
   * without a live GPU context, go through #sky, which keeps showing its frame
   * when a context is lost.
   */
  function draw() {
    const live = playing && renderer.present(width, height);
    if (!live) paint();
    if (live !== presenting) {
      presenting = live;
      show(live);
    }
  }
  function paint() {
    if (width !== canvas.width || height !== canvas.height) {
      canvas.width = width;
      canvas.height = height;
    }
    const fit = fitArt(width, height);
    if (!fit) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.setTransform(fit.scale, 0, 0, fit.scale, fit.x, 0);
    renderer.paint(context);
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = fit.wide ? feathers.wide : feathers.tall;
    // Start past the art edge: at a fractional offset its partly covered column
    // would otherwise keep some alpha and show as a seam.
    if (fit.wide) context.fillRect(-4, 0, FEATHER.wide + 4, ART_HEIGHT);
    else
      context.fillRect(
        0,
        FEATHER.tall,
        ART_WIDTH,
        ART_HEIGHT - FEATHER.tall + 4,
      );
    context.globalCompositeOperation = "source-over";
  }
  /** Sizes the frame to the canvas box, `w`x`h` device px, and redraws; `force` redraws at an unchanged size too. */
  function layout(w: number, h: number, force: boolean) {
    // Assigning a size reallocates and clears a canvas even when it is
    // unchanged, as on the observer's first callback, so keep that frame.
    if (!force && w === width && h === height) return;
    width = w;
    height = h;
    draw();
  }
  function frame(now: number) {
    if (policy.ready(now)) {
      // Speeds use the real gap. Across a stall the simulation's clamped dt would
      // inflate them, so the pod sees no swipe over it.
      const sense = instrument.frame(policy.gap);
      renderer.step(
        policy.dt,
        policy.gap > policy.dt ? { ...sense, previous: sense.hand } : sense,
        instrument.pointer,
      );
      draw();
    }
    frameId = requestAnimationFrame(frame);
  }
  function sync() {
    // A paused frame moves to #sky, before calm() changes what it would show.
    if (!playing && presenting) draw();
    cancelAnimationFrame(frameId);
    policy.reset();
    instrument.clear();
    renderer.pod.calm();
    if (playing && !hidden) frameId = requestAnimationFrame(frame);
  }
  // A failed first render must not strand the GPU context.
  try {
    layout(startWidth, startHeight, true);
  } catch (error) {
    renderer.dispose();
    canvas.width = 0;
    throw error;
  }
  return {
    resize(w: number, h: number) {
      layout(w, h, false);
    },
    move({ x, y, blocked, kind, buttons, timeStamp }: PointerSample) {
      // No buttons held means any press lost its pointerup (e.g. to a context menu).
      if (kind !== "touch" && buttons === 0) instrument.cancel();
      instrument.move(x, y, kind, blocked, timeStamp);
    },
    down({ x, y, blocked, kind, clientX, clientY, timeStamp }: PointerSample) {
      instrument.down(x, y, kind, blocked, clientX, clientY, timeStamp);
    },
    up({ x, y, blocked, kind, clientX, clientY, timeStamp }: PointerSample) {
      instrument.up(x, y, kind, clientX, clientY, timeStamp);
      // Releasing over the card or a link must not leave a hover behind it.
      instrument.move(x, y, kind, blocked, timeStamp);
    },
    cancel() {
      instrument.cancel();
    },
    leave() {
      instrument.leave();
    },
    setPlaying(value: boolean) {
      playing = value;
      sync();
    },
    /** Whether the page's tab is hidden. */
    setHidden(value: boolean) {
      hidden = value;
      sync();
    },
    /**
     * The page now shows what show() asked for. Behind the WebGL canvas,
     * #sky need not hold a frame; paint() sizes it again.
     */
    shown(live: boolean) {
      if (live && presenting) canvas.width = 0;
    },
    dispose() {
      playing = false;
      cancelAnimationFrame(frameId);
      renderer.dispose();
      canvas.width = 0;
    },
  };
}
