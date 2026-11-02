import { FramePolicy } from "./frame-policy";
import { FlightRenderer } from "./renderer";
import { ART_HEIGHT, ART_WIDTH, fitArt, pointerToArt } from "./viewport";

/** The React owner decodes the image before allocating a disposable renderer. */
export function createBackground(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
) {
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext)
    throw new Error("The artwork renderer could not create a 2D canvas");
  const context = canvasContext;
  // While paused, nothing else repaints the GL frame after a context restore.
  const renderer = FlightRenderer.create(image, () => {
    if (!playing) draw();
  });
  const coarse = matchMedia("(pointer: coarse)").matches;
  const policy = new FramePolicy(coarse || !renderer.accelerated ? 30 : 60);
  const pointer = { x: 0.5, y: 0.5, active: false };
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
      renderer.step(policy.dt, pointer);
      draw();
    }
    frameId = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(frameId);
    policy.reset();
    pointer.active = false;
    if (playing && !document.hidden) frameId = requestAnimationFrame(frame);
  }
  function move(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    if (!fitArt(rect.width, rect.height)) return;
    const blocked =
      event.target instanceof Element &&
      !!event.target.closest("button,a,input,.material");
    const art = pointerToArt(rect, event.clientX, event.clientY);
    pointer.x = art.x;
    pointer.y = art.y;
    pointer.active =
      event.pointerType !== "touch" &&
      !blocked &&
      art.x >= 0 &&
      art.x <= 1 &&
      art.y >= 0 &&
      art.y <= 1;
  }
  const clearPointer = () => {
    pointer.active = false;
  };
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
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerleave", clearPointer);
  document.addEventListener("scroll", clearPointer, { passive: true });
  document.addEventListener("visibilitychange", sync);
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
      document.removeEventListener("pointerleave", clearPointer);
      document.removeEventListener("scroll", clearPointer);
      document.removeEventListener("visibilitychange", sync);
      renderer.dispose();
      canvas.width = 0;
    },
  };
}
