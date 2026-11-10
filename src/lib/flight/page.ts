/**
 * The page's end of the painting: it owns the two canvases, and tells the
 * renderer's worker their size, where the pointer is, and whether to play.
 * Nothing here draws.
 */
import type { PointerSample } from "./background";
import type { FromRenderer, ToRenderer } from "./protocol";
import { pointerToArt } from "./viewport";

export type FlightOptions = {
  /** The painting's URL. */
  artwork: string;
  playing: boolean;
  /**
   * How long to hold the renderer's GPU work, ms. Its script and the painting
   * load and decode meanwhile.
   */
  delay: number;
  /** The first frame is on the page: the poster can go. */
  onReady: () => void;
  /** The renderer stopped; the canvases are gone and the poster should show. */
  onFailed: (reason: string) => void;
};

export type Flight = {
  setPlaying(value: boolean): void;
  dispose(): void;
};

/** Whether this browser can draw a page canvas from a worker. */
function supported() {
  return (
    typeof Worker === "function" &&
    typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function"
  );
}

/**
 * Adds #sky and #sky-gl to `frame` and, after `delay`, starts the renderer on
 * them. Null where a worker cannot draw them: the poster stays.
 */
export function startFlight(
  frame: HTMLElement | null,
  {
    artwork,
    playing: initiallyPlaying,
    delay,
    onReady,
    onFailed,
  }: FlightOptions,
): Flight | null {
  if (!frame || !supported()) return null;
  // Still frames; and while the art animates, WebGL draws straight onto the
  // second canvas, laid over the first.
  const sky = document.createElement("canvas");
  sky.id = "sky";
  const surface = document.createElement("canvas");
  surface.id = "sky-gl";
  surface.style.visibility = "hidden";
  frame.append(sky, surface);
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  const send = (message: ToRenderer, transfer: Transferable[] = []) =>
    worker.postMessage(message, transfer);
  /** The canvas box in device px, at most 1.5 per CSS px. */
  function size() {
    const rect = sky.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    return {
      width: Math.round(rect.width * ratio),
      height: Math.round(rect.height * ratio),
    };
  }
  /** Pointer in display-art units; off the art or over the UI counts as blocked. */
  function locate(event: PointerEvent): PointerSample {
    const art = pointerToArt(
      sky.getBoundingClientRect(),
      event.clientX,
      event.clientY,
    );
    return {
      ...art,
      blocked:
        (event.target instanceof Element &&
          !!event.target.closest("button,a,input,.material")) ||
        art.x < 0 ||
        art.x > 1 ||
        art.y < 0 ||
        art.y > 1,
      kind:
        event.pointerType === "touch" || event.pointerType === "pen"
          ? event.pointerType
          : "mouse",
      clientX: event.clientX,
      clientY: event.clientY,
      buttons: event.buttons,
      timeStamp: event.timeStamp,
    };
  }
  const move = (event: PointerEvent) =>
    send({ type: "pointer", phase: "move", sample: locate(event) });
  const down = (event: PointerEvent) => {
    if (event.button === 0)
      send({ type: "pointer", phase: "down", sample: locate(event) });
  };
  const up = (event: PointerEvent) =>
    send({ type: "pointer", phase: "up", sample: locate(event) });
  const cancel = () => send({ type: "cancel" });
  const leave = () => send({ type: "leave" });
  const visibility = () => send({ type: "hidden", value: document.hidden });
  const observer = new ResizeObserver(() =>
    send({ type: "resize", ...size() }),
  );
  const download = new AbortController();
  let playing = initiallyPlaying,
    begun = false,
    disposed = false;
  /** Hands the renderer the canvases: from here it uses the GPU. */
  function begin() {
    begun = true;
    const offscreenSky = sky.transferControlToOffscreen();
    const offscreenSurface = surface.transferControlToOffscreen();
    send(
      {
        type: "start",
        sky: offscreenSky,
        surface: offscreenSurface,
        ...size(),
        coarse: matchMedia("(pointer: coarse)").matches,
        playing,
        hidden: document.hidden,
      },
      [offscreenSky, offscreenSurface],
    );
  }
  const timer = setTimeout(begin, delay);
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    download.abort();
    observer.disconnect();
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerdown", down);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", cancel);
    document.removeEventListener("contextmenu", cancel);
    document.removeEventListener("pointerleave", leave);
    document.removeEventListener("scroll", cancel);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", leave);
    // Ends the renderer and frees its GPU context with it.
    worker.terminate();
    sky.remove();
    surface.remove();
  }
  function fail(reason: string) {
    if (disposed) return;
    dispose();
    onFailed(reason);
  }
  worker.addEventListener("message", (event: MessageEvent<FromRenderer>) => {
    const message = event.data;
    switch (message.type) {
      case "ready":
        onReady();
        return;
      case "show": {
        const { live } = message;
        surface.style.visibility = live ? "" : "hidden";
        sky.style.visibility = live ? "hidden" : "";
        // Once this swap has painted, the renderer may free the hidden canvas.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (!disposed) send({ type: "shown", live });
          }),
        );
        return;
      }
      case "failed":
        fail(message.reason);
        return;
      default:
        message satisfies never;
    }
  });
  worker.addEventListener("error", (event) =>
    fail(event.message || "The renderer's script failed to load or run."),
  );

  // The layout's preload already has this request under way.
  void fetch(artwork, { signal: download.signal })
    .then((response) => {
      if (!response.ok)
        throw new Error(
          `The painting's request for ${artwork} returned ${response.status}.`,
        );
      return response.blob();
    })
    .then(
      (file) => {
        if (!disposed) send({ type: "artwork", file });
      },
      (error: unknown) => fail(String(error)),
    );

  observer.observe(sky);
  // Passive and never prevented, so touch scrolling and text selection still win.
  const passive = { passive: true };
  document.addEventListener("pointermove", move, passive);
  document.addEventListener("pointerdown", down, passive);
  document.addEventListener("pointerup", up, passive);
  document.addEventListener("pointercancel", cancel, passive);
  document.addEventListener("contextmenu", cancel, passive);
  document.addEventListener("pointerleave", leave, passive);
  document.addEventListener("scroll", cancel, passive);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", leave);
  return {
    setPlaying(value: boolean) {
      playing = value;
      if (begun && !disposed) send({ type: "playing", value });
    },
    dispose,
  };
}
