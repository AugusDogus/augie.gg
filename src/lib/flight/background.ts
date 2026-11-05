import type { SurfaceStart } from "./flow-surface";
import { FramePolicy } from "./frame-policy";
import { Instrument, type PointerKind } from "./instrument";
import { FlightRenderer } from "./renderer";
import type { Artwork } from "./texture";
import {
  ART_HEIGHT,
  ART_WIDTH,
  FEATHER,
  fitArt,
  pointerToArt,
} from "./viewport";

/**
 * The React owner decodes the image before allocating a disposable renderer,
 * and may begin the GPU `start` before that, so shaders compile meanwhile.
 */
export function createBackground(
  canvas: HTMLCanvasElement,
  image: Artwork,
  start?: SurfaceStart | null,
) {
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext)
    throw new Error("The artwork renderer could not create a 2D canvas");
  const context = canvasContext;
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
  // Animating frames draw straight onto this canvas, laid over #sky.
  const surface = renderer.canvas;
  const coarse = matchMedia("(pointer: coarse)").matches;
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
    if (surface && live !== presenting) {
      presenting = live;
      surface.style.visibility = live ? "" : "hidden";
      canvas.style.visibility = live ? "hidden" : "";
      // Hidden, #sky need not hold a frame; paint() sizes it again.
      if (live) canvas.width = 0;
    }
    if (!live) paint();
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
  /** Sizes the frame to the canvas box and redraws; `force` redraws at an unchanged size too. */
  function layout(force: boolean) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(rect.width * ratio),
      h = Math.round(rect.height * ratio);
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
    if (playing && !document.hidden) frameId = requestAnimationFrame(frame);
  }
  /** Pointer in display-art units; off the art or over the UI counts as blocked. */
  function locate(event: PointerEvent) {
    const art = pointerToArt(
      canvas.getBoundingClientRect(),
      event.clientX,
      event.clientY,
    );
    const blocked =
      (event.target instanceof Element &&
        !!event.target.closest("button,a,input,.material")) ||
      art.x < 0 ||
      art.x > 1 ||
      art.y < 0 ||
      art.y > 1;
    const kind: PointerKind =
      event.pointerType === "touch" || event.pointerType === "pen"
        ? event.pointerType
        : "mouse";
    return { ...art, blocked, kind };
  }
  function move(event: PointerEvent) {
    const { x, y, blocked, kind } = locate(event);
    // No buttons held means any press lost its pointerup (e.g. to a context menu).
    if (kind !== "touch" && event.buttons === 0) instrument.cancel();
    instrument.move(x, y, kind, blocked, event.timeStamp);
  }
  function down(event: PointerEvent) {
    if (event.button !== 0) return;
    const { x, y, blocked, kind } = locate(event);
    instrument.down(
      x,
      y,
      kind,
      blocked,
      event.clientX,
      event.clientY,
      event.timeStamp,
    );
  }
  function up(event: PointerEvent) {
    const { x, y, blocked, kind } = locate(event);
    instrument.up(x, y, kind, event.clientX, event.clientY, event.timeStamp);
    // Releasing over the card or a link must not leave a hover behind it.
    instrument.move(x, y, kind, blocked, event.timeStamp);
  }
  const cancel = () => instrument.cancel();
  const leave = () => instrument.leave();
  // Draw before subscribing, so a failed first render cannot leak listeners.
  try {
    layout(true);
  } catch (error) {
    renderer.dispose();
    canvas.width = 0;
    throw error;
  }
  if (surface) {
    surface.id = "sky-gl";
    surface.style.visibility = "hidden";
    canvas.after(surface);
  }
  const observer = new ResizeObserver(() => layout(false));
  observer.observe(canvas);
  // Passive and never prevented, so touch scrolling and text selection still win.
  const passive = { passive: true };
  document.addEventListener("pointermove", move, passive);
  document.addEventListener("pointerdown", down, passive);
  document.addEventListener("pointerup", up, passive);
  document.addEventListener("pointercancel", cancel, passive);
  document.addEventListener("contextmenu", cancel, passive);
  document.addEventListener("pointerleave", leave, passive);
  document.addEventListener("scroll", cancel, passive);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("blur", leave);
  return {
    setPlaying(value: boolean) {
      playing = value;
      sync();
    },
    dispose() {
      playing = false;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
      document.removeEventListener("contextmenu", cancel);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("scroll", cancel);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("blur", leave);
      surface?.remove();
      canvas.style.visibility = "";
      renderer.dispose();
      canvas.width = 0;
    },
  };
}
