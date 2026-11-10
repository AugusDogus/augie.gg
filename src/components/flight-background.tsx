"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import poster from "~/assets/flight-poster.avif";
import { startFlight, type Flight } from "~/lib/flight/page";
import artwork from "../../public/flight4cover_redux_spread.jpg";

/**
 * How long after hydration the entrance (globals.css, `rise`) is still
 * playing. The renderer's shader compiles occupy the GPU process, which also
 * draws the page, so it starts once the entrance cannot drop a frame to it.
 */
const ENTRANCE_MS = 1000;

/**
 * The poster as markup, because its fade must not wait for hydration: it
 * runs from the image's own load event. An image that loaded before the
 * first paint (a repeat visit) just shows.
 */
const POSTER = `<img src="${poster.src}" alt="" fetchpriority="high" onload="performance.getEntriesByType('paint').length&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&this.animate({opacity:[0,1]},{duration:450,easing:'ease-out'})">`;

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
/** The running painting, for whatever on the page has something to tell it. */
let live: Flight | null = null;
/** Something on the page went well: the whales in view flick their flukes. */
export function cheer() {
  live?.cheer();
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

/**
 * The painting behind every page: its poster, and over it the canvases the
 * renderer draws from its own thread (lib/flight/page.ts), so nothing here
 * waits on WebGL. Browsers that cannot draw a canvas from a worker keep the
 * poster.
 */
export function FlightBackground() {
  const frame = useRef<HTMLDivElement>(null);
  const flight = useRef<Flight | null>(null);
  const { playing: active } = usePlaying();
  const activeRef = useRef(active);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    activeRef.current = active;
    flight.current?.setPlaying(active);
  }, [active]);
  useEffect(() => {
    // No entrance plays on a later visit to home, or with reduced motion.
    const entering =
      !("settled" in document.documentElement.dataset) &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    flight.current = startFlight(frame.current, {
      artwork: artwork.src,
      playing: activeRef.current,
      delay: entering ? ENTRANCE_MS : 0,
      onReady: () => setReady(true),
      onFailed(reason) {
        console.warn(
          "The animated artwork could not run. The pre-rendered background remains available.",
          reason,
        );
        flight.current = null;
        live = null;
        setReady(false);
      },
    });
    live = flight.current;
    if (process.env.NODE_ENV === "development")
      void import("~/lib/flight/poster").then((tools) =>
        tools.installFlightDebug(artwork.src),
      );
    return () => {
      flight.current?.dispose();
      flight.current = null;
      live = null;
    };
  }, []);
  return (
    <div ref={frame} className="artwork" data-ready={ready} aria-hidden="true">
      <div
        className="artwork-poster"
        dangerouslySetInnerHTML={{ __html: POSTER }}
      />
    </div>
  );
}
