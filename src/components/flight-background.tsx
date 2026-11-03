"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { createBackground } from "~/lib/flight/background";
import { SurfaceStart } from "~/lib/flight/flow-surface";
import { loadArtwork } from "~/lib/flight/texture";

// The persistent root background and the home dock share one motion preference.
let paused = false;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function subscribeMotion(listener: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
/** Pauses or resumes the artwork; shared by the dock and the command menu. */
export function toggleAnimation() {
  paused = !paused;
  listeners.forEach((listener) => listener());
}

export function usePlaying() {
  const userPaused = useSyncExternalStore(
    subscribe,
    () => paused,
    () => false,
  );
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  return { playing: !userPaused && !reduced, reduced };
}

export function FlightBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createBackground> | null>(null);
  const pathname = usePathname();
  const { playing } = usePlaying();
  const active = playing && pathname === "/";
  const activeRef = useRef(active);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    activeRef.current = active;
    renderer.current?.setPlaying(active);
  }, [active]);
  useEffect(() => {
    let disposed = false;
    const artwork = loadArtwork("/flight4cover_redux_spread.jpg");
    // The shaders compile while the artwork decodes.
    const start = SurfaceStart.begin();
    async function initialize() {
      try {
        const image = await artwork;
        if (disposed || !canvas.current) return;
        const background = createBackground(canvas.current, image, start);
        renderer.current = background;
        background.setPlaying(activeRef.current);
        setReady(true);
        if (process.env.NODE_ENV === "development")
          void import("~/lib/flight/poster").then((poster) =>
            poster.installFlightDebug(image),
          );
      } catch (error) {
        console.warn(
          "The animated artwork could not load. The pre-rendered background remains available.",
          error,
        );
      } finally {
        // A no-op once the renderer took it.
        start?.dispose();
      }
    }
    void initialize();
    return () => {
      disposed = true;
      start?.dispose();
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  return (
    <div className="artwork" data-ready={ready} aria-hidden="true">
      <div className="artwork-poster" />
      <canvas id="sky" ref={canvas} />
    </div>
  );
}
