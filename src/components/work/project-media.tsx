"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePlaying } from "~/components/flight-background";
import type { Media } from "~/content/projects";
import { cn } from "~/lib/utils";

/** Save-Data, where the browser reports it. */
function savesData(): boolean {
  if (!("connection" in navigator)) return false;
  const connection: unknown = navigator.connection;
  return (
    typeof connection === "object" &&
    connection !== null &&
    "saveData" in connection &&
    connection.saveData === true
  );
}

/** A capture's pixels at its own aspect ratio, so nothing shifts while it loads. */
function Screen({
  media,
  sizes,
  decorative,
  className,
}: {
  media: Media;
  sizes: string;
  decorative: boolean;
  className?: string;
}) {
  const alt = decorative ? "" : media.alt;
  const pixelated = media.frame === "console";
  const image = cn(
    "absolute inset-0 size-full object-contain",
    // Console output stays nearest neighbor once each of its 640 columns gets
    // a device pixel (the picture spans 0.847 of the set's width); any smaller
    // and nearest neighbor drops whole columns, so it resamples instead.
    pixelated &&
      "@min-[756px]:[image-rendering:pixelated] [@media(min-resolution:2dppx)]:@min-[378px]:[image-rendering:pixelated] [@media(min-resolution:3dppx)]:@min-[252px]:[image-rendering:pixelated]",
  );
  return (
    <div
      className={cn("relative overflow-hidden bg-[#05090b]", className)}
      style={
        media.frame === "console"
          ? undefined
          : { aspectRatio: `${media.width} / ${media.height}` }
      }
    >
      {media.kind === "image" ? (
        <Image
          src={media.src}
          alt={alt}
          width={media.width}
          height={media.height}
          sizes={sizes}
          unoptimized={pixelated}
          className={image}
        />
      ) : (
        <Video media={media} alt={alt} sizes={sizes} className={image} />
      )}
    </div>
  );
}

/**
 * A silent loop that plays only while on screen, with motion allowed and no
 * Save-Data; otherwise, and before it starts, its poster.
 */
function Video({
  media,
  alt,
  sizes,
  className,
}: {
  media: Extract<Media, { kind: "video" }>;
  alt: string;
  sizes: string;
  className: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const { playing, reduced } = usePlaying();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false);
  const wanted = visible && playing;
  // Mounted on first play and kept, so scrolling away and back resumes in place.
  if (wanted && !mounted && !savesData()) setMounted(true);

  useEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // It autoplays as it mounts; after that, this pauses and resumes it.
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!wanted) {
      element.pause();
      return;
    }
    // A refused play() (autoplay policy, an interrupted load) leaves the poster up.
    element.play().catch(() => undefined);
  }, [wanted]);

  return (
    <div ref={root} className="absolute inset-0">
      <Image
        src={media.poster}
        alt={alt}
        width={media.width}
        height={media.height}
        sizes={sizes}
        className={className}
      />
      {mounted && (
        <video
          ref={video}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => setStarted(true)}
          data-started={started && !reduced}
          className={cn(
            className,
            "opacity-0 transition-opacity duration-300 ease-out data-[started=true]:opacity-100",
          )}
        >
          <source src={media.mp4} type="video/mp4" />
          <source src={media.src} type="video/webm" />
        </video>
      )}
    </div>
  );
}

/** Thin glass around a browser or desktop capture; no fake window controls. */
function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <div className="rounded-(--r) border border-white/[.12] bg-[linear-gradient(180deg,#ffffff1c,#ffffff0a)] p-(--p) shadow-[inset_0_1px_0_#ffffff1a,0_1px_2px_#00000040,0_24px_64px_-16px_#000000a6] [--p:clamp(2px,0.7cqw,6px)] [--r:clamp(6px,1.7cqw,14px)]">
        <div className="overflow-hidden rounded-[calc(var(--r)-var(--p)-1px)] shadow-[0_0_0_1px_#00000066]">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A modern phone's silhouette: even bezel, screen corners to match. */
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <div className="relative rounded-[16cqw] bg-[linear-gradient(160deg,#28343a,#0d1418_45%,#0a1013)] p-[3.2cqw] shadow-[inset_0_0_0_1px_#ffffff26,inset_0_0_0_2px_#00000080,0_1px_2px_#00000040,0_24px_64px_-16px_#000000b3]">
        <div className="overflow-hidden rounded-[12.8cqw] shadow-[0_0_0_1px_#000000]">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A 4:3 set: dark bezel and a black screen, the frame letterboxed in, never stretched. */
function ConsoleFrame({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <div className="rounded-[2.6cqw] bg-[linear-gradient(180deg,#20292e,#11181c)] p-[3.4cqw] shadow-[inset_0_1px_0_#ffffff1f,inset_0_0_0_1px_#ffffff0d,0_1px_2px_#00000040,0_24px_64px_-16px_#000000b3]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4cqw] bg-black shadow-[0_0_0_1px_#000000b3]">
          {children}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_3cqw_#000000cc]"
          />
        </div>
      </div>
    </div>
  );
}

/** Width over height of a capture with its frame, for fitting one into a box before it renders. */
export function framedAspect(media: Media): number {
  const height = media.height / media.width;
  switch (media.frame) {
    case "desktop":
      return 1 / (height + 0.016);
    case "phone":
      return 1 / (height * 0.936 + 0.064);
    case "console":
      return 1 / (0.932 * 0.75 + 0.068);
    default: {
      const unreachable: never = media.frame;
      return unreachable;
    }
  }
}

/**
 * One capture in the frame its `frame` names: a browser or desktop window,
 * a phone, or a TV. `sizes` is the rendered width, for picking an image size.
 * `decorative` drops the alt text where something else names the project,
 * such as inside a project's own button.
 */
export function ProjectMedia({
  media,
  sizes,
  decorative = false,
  className,
}: {
  media: Media;
  sizes: string;
  decorative?: boolean;
  className?: string;
}) {
  return <div className={className}>{framed(media, sizes, decorative)}</div>;
}

function framed(media: Media, sizes: string, decorative: boolean) {
  switch (media.frame) {
    case "desktop":
      return (
        <DesktopFrame>
          <Screen media={media} sizes={sizes} decorative={decorative} />
        </DesktopFrame>
      );
    case "phone":
      return (
        <PhoneFrame>
          <Screen media={media} sizes={sizes} decorative={decorative} />
        </PhoneFrame>
      );
    case "console":
      return (
        <ConsoleFrame>
          <Screen
            media={media}
            sizes={sizes}
            decorative={decorative}
            className="absolute inset-0 bg-black"
          />
        </ConsoleFrame>
      );
    default: {
      const unreachable: never = media.frame;
      return unreachable;
    }
  }
}
