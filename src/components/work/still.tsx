"use client";

import Image from "next/image";
import { type ComponentProps, useLayoutEffect, useRef, useState } from "react";
import { WhaleLoader } from "./whale-loader";

/** A still that arrives sooner than this just shows, as a cached one does. */
const PROMPT_MS = 150;
const FADE_MS = 300;

/**
 * A capture's still pixels. Until they arrive, whales hold the frame; a still
 * that kept the viewer waiting then fades in over them. Its parent must be a
 * positioned size container, as every capture's frame is.
 */
export function Still(props: ComponentProps<typeof Image>) {
  const image = useRef<HTMLImageElement>(null);
  const [waiting, setWaiting] = useState(true);
  const mounted = useRef(0);

  // Before the browser can deliver a load event, so `mounted` is never read unset.
  useLayoutEffect(() => {
    mounted.current = performance.now();
    // One that finished before hydration fires no load event here.
    if (image.current?.complete) setWaiting(false);
  }, []);

  return (
    <>
      {waiting && <WhaleLoader />}
      <Image
        {...props}
        ref={image}
        onLoad={(event) => {
          const prompt = performance.now() - mounted.current < PROMPT_MS;
          if (
            prompt ||
            matchMedia("(prefers-reduced-motion: reduce)").matches
          ) {
            setWaiting(false);
            return;
          }
          const arrived = () => setWaiting(false);
          event.currentTarget
            .animate(
              { opacity: [0, 1] },
              { duration: FADE_MS, easing: "ease-out" },
            )
            .finished.then(arrived, arrived);
        }}
        // A still that cannot load leaves the frame's plain ground.
        onError={() => setWaiting(false)}
      />
    </>
  );
}
