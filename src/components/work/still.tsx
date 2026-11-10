"use client";

import Image from "next/image";
import {
  type ComponentProps,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { WhaleLoader } from "./whale-loader";

/** A still that arrives sooner than this just shows, as a cached one does. */
const PROMPT_MS = 150;
const FADE_MS = 300;

/**
 * Where a still is. The server and the first client render cannot know, and
 * leave it to the browser, so it shows without JavaScript too.
 */
type Arrival =
  | "unknown"
  /** Not here when the page looked: hidden, so it cannot show before its fade. */
  | "waiting"
  /** Arrived after a wait, and fading in over the whales. */
  | "fading"
  | "here";

/**
 * A capture's still pixels. Until they arrive, whales hold the frame; a still
 * that kept the viewer waiting then fades in over them. Its parent must be a
 * positioned size container, as every capture's frame is.
 */
export function Still({ style, ...props }: ComponentProps<typeof Image>) {
  const image = useRef<HTMLImageElement>(null);
  const [arrival, setArrival] = useState<Arrival>("unknown");
  const mounted = useRef(0);

  // Before the first paint: a still on its way must not show until it fades in.
  useLayoutEffect(() => {
    mounted.current = performance.now();
    setArrival(image.current?.complete ? "here" : "waiting");
  }, []);

  // The whales stay under the still until its fade has covered them.
  useEffect(() => {
    if (arrival !== "fading") return undefined;
    const timer = setTimeout(() => setArrival("here"), FADE_MS);
    return () => clearTimeout(timer);
  }, [arrival]);

  return (
    <>
      {(arrival === "waiting" || arrival === "fading") && <WhaleLoader />}
      <Image
        {...props}
        ref={image}
        style={
          arrival === "waiting"
            ? { ...style, opacity: 0 }
            : arrival === "fading"
              ? { ...style, transition: `opacity ${FADE_MS}ms ease-out` }
              : style
        }
        // Called once the still has decoded, which is after the browser could
        // first paint it: hence hiding it while it waits.
        onLoad={() => {
          const prompt = performance.now() - mounted.current < PROMPT_MS;
          const still =
            prompt || matchMedia("(prefers-reduced-motion: reduce)").matches;
          setArrival((current) =>
            current !== "waiting" ? current : still ? "here" : "fading",
          );
        }}
        // A still that cannot load leaves the frame's plain ground.
        onError={() => setArrival("here")}
      />
    </>
  );
}
