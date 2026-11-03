"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { createBackground } from "~/lib/flight/background";

// The persistent root background and the home caption share one motion preference.
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
function usePlaying() {
  const userPaused = useSyncExternalStore(
    subscribe,
    () => paused,
    () => false,
  );
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
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
    const image = new Image();
    image.src = "/flight4cover_redux_spread.jpg";
    async function initialize() {
      try {
        await image.decode();
        if (disposed || !canvas.current) return;
        const background = createBackground(canvas.current, image);
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
      }
    }
    void initialize();
    return () => {
      disposed = true;
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

export function ArtworkCaption() {
  const { playing, reduced } = usePlaying();
  return (
    <div className="art-caption on-sky">
      {reduced ? (
        <span>Animation off (reduced motion)</span>
      ) : (
        <Button
          variant="link"
          className="text-inherit hover:text-white hover:no-underline"
          onClick={() => {
            paused = !paused;
            listeners.forEach((listener) => listener());
          }}
        >
          {playing ? "Pause animation" : "Play animation"}
        </Button>
      )}
      <a
        className="hover:text-white"
        href="https://www.gallerynucleus.com/detail/2126/"
        target="_blank"
        rel="noopener noreferrer"
      >
        “Flight” by Kazu Kibuishi
      </a>
    </div>
  );
}
