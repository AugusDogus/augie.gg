import type { SurfaceStart } from "./flow-surface";
import { FramePolicy } from "./frame-policy";
import { Instrument, type PointerKind } from "./instrument";
import { FlightRenderer } from "./renderer";
import type { Artwork } from "./texture";
import { ART_HEIGHT, ART_WIDTH, fitArt, pointerToArt } from "./viewport";

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
  // While paused, nothing else repaints the GL frame after a context restore.
  const renderer = FlightRenderer.create(
    image,
    () => {
      if (!playing) draw();
    },
    start,
  );
  const coarse = matchMedia("(pointer: coarse)").matches;
  const policy = new FramePolicy(coarse || !renderer.accelerated ? 30 : 60);
  const instrument = new Instrument();
  // Gradients resolve against the transform at fill time, so one per edge suffices.
  const feathers = {
    wide: context.createLinearGradient(0, 0, 200, 0),
    tall: context.createLinearGradient(0, 700, 0, ART_HEIGHT),
  };
  feathers.wide.addColorStop(0, "black");
  feathers.wide.addColorStop(1, "transparent");
  feathers.tall.addColorStop(0, "transparent");
  feathers.tall.addColorStop(1, "black");
  let playing = false,
    frameId = 0;

  function draw() {
    const fit = fitArt(canvas.width, canvas.height);
    if (!fit) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(fit.scale, 0, 0, fit.scale, fit.x, 0);
    renderer.paint(context);
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = fit.wide ? feathers.wide : feathers.tall;
    // Start past the art edge: at a fractional offset its partly covered column
    // would otherwise keep some alpha and show as a seam.
    if (fit.wide) context.fillRect(-4, 0, 204, ART_HEIGHT);
    else context.fillRect(0, 700, ART_WIDTH, ART_HEIGHT - 696);
    context.globalCompositeOperation = "source-over";
  }
  function layout() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
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
    layout();
  } catch (error) {
    renderer.dispose();
    canvas.width = 0;
    throw error;
  }
  const observer = new ResizeObserver(layout);
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
      renderer.dispose();
      canvas.width = 0;
    },
  };
}
