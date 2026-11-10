import type { PointerSample } from "./background";

/** What the page sends the renderer's worker. */
export type ToRenderer =
  /** The page's two canvases and its state; shaders start compiling at once. */
  | {
      type: "start";
      sky: OffscreenCanvas;
      surface: OffscreenCanvas;
      /** The canvas box in device px. */
      width: number;
      height: number;
      coarse: boolean;
      playing: boolean;
      hidden: boolean;
    }
  /** The painting's file, once downloaded. */
  | { type: "artwork"; file: Blob }
  | { type: "resize"; width: number; height: number }
  | { type: "pointer"; phase: "move" | "down" | "up"; sample: PointerSample }
  | { type: "cancel" }
  | { type: "leave" }
  | { type: "playing"; value: boolean }
  | { type: "hidden"; value: boolean }
  /** The page now shows the canvas a "show" asked for. */
  | { type: "shown"; live: boolean };

/** What the worker sends back. */
export type FromRenderer =
  /** The first frame is on #sky: swap it in for the poster. */
  | { type: "ready" }
  /** Show the WebGL canvas (live) or #sky. */
  | { type: "show"; live: boolean }
  | { type: "failed"; reason: string };
