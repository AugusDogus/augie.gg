import { canvas2d, renderTexture } from "./texture";
import { Flow } from "./flow";
import { FlowSurface } from "./flow-surface";
import { Specks, drawSpecks } from "./specks";
import { Whales } from "./whales";
import { renderWhaleFilter } from "./whale-filter";

/** The React owner decodes the image before allocating a disposable renderer. */
export function createBackground(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
) {
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext)
    throw new Error("The artwork renderer could not create a 2D canvas");
  const context = canvasContext;
  const texture = renderTexture(image);
  const layer = canvas2d(1200, 874);
  const flow = new Flow(),
    specks = new Specks(),
    whales = new Whales();
  const surface = FlowSurface.create();
  const pointer = { x: 0.5, y: 0.5, active: false };
  let playing = false,
    elapsed = 0,
    last = 0,
    frameId = 0;

  function draw() {
    const scale = Math.min(canvas.width / 1200, canvas.height / 874);
    if (scale <= 0) return;
    const ox = canvas.width - 1200 * scale;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(scale, 0, 0, scale, ox, 0);
    renderWhaleFilter(layer.context, whales.snapshot());
    const scene = surface?.render(
      texture,
      image,
      elapsed,
      flow.snapshot(),
      layer.canvas,
    );
    context.drawImage(scene || texture, 0, 0, 1200, 874);
    if (!scene) context.drawImage(layer.canvas, 0, 0);
    drawSpecks(context, specks.snapshot());
    const wide = canvas.width / canvas.height > 1200 / 874;
    const feather = wide
      ? context.createLinearGradient(0, 0, 200, 0)
      : context.createLinearGradient(0, 700, 0, 874);
    feather.addColorStop(0, wide ? "transparent" : "black");
    feather.addColorStop(1, wide ? "black" : "transparent");
    context.globalCompositeOperation = "destination-in";
    context.fillStyle = feather;
    context.fillRect(0, 0, 1200, 874);
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
    if (now - last >= 1000 / 30) {
      const dt = last ? Math.min((now - last) / 1000, 0.06) : 0;
      last = now;
      elapsed += dt;
      flow.step(dt, pointer);
      specks.step(dt, elapsed, pointer);
      whales.step(dt);
      draw();
    }
    frameId = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(frameId);
    last = 0;
    pointer.active = false;
    if (playing && !document.hidden) frameId = requestAnimationFrame(frame);
  }
  function move(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1200, rect.height / 874);
    if (!scale) return;
    const blocked =
      event.target instanceof Element &&
      !!event.target.closest("button,a,input,.material");
    pointer.x =
      (event.clientX - rect.left - (rect.width - 1200 * scale)) /
      (1200 * scale);
    pointer.y = (event.clientY - rect.top) / (874 * scale);
    pointer.active =
      event.pointerType !== "touch" &&
      !blocked &&
      pointer.x >= 0 &&
      pointer.x <= 1 &&
      pointer.y >= 0 &&
      pointer.y <= 1;
  }
  const clearPointer = () => {
    pointer.active = false;
  };
  // Draw before subscribing, so a failed first render cannot leak listeners.
  try {
    layout();
  } catch (error) {
    surface?.dispose();
    texture.width = 0;
    layer.canvas.width = 0;
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
      surface?.dispose();
      texture.width = 0;
      layer.canvas.width = 0;
      canvas.width = 0;
    },
  };
}
