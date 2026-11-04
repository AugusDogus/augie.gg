"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePlaying } from "~/components/flight-background";
import type { Media } from "~/content/projects";
import { cn } from "~/lib/utils";
import { Showcase } from "./showcase";

/**
 * Every screen capture's frame, image or video alike: a hairline border, an
 * inner hairline over the pixels, a soft drop shadow, and a dark ground while
 * it loads. Callers set the radius, so thumbnails can sit tighter.
 */
export const SCREEN_FRAME =
  "relative overflow-hidden bg-[#05090b] shadow-[0_0_0_1px_#ffffff1f,0_1px_2px_#00000066,0_16px_40px_-16px_#000000b3] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_#0000004d]";

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

/**
 * Pixel art stays nearest neighbor once each of its columns gets a device
 * pixel; any smaller and nearest neighbor drops whole columns, so it resamples
 * instead. The widths assume a 640-column picture exported at 2x, as console
 * output is.
 */
const PIXELATED =
  "@min-[640px]:[image-rendering:pixelated] [@media(min-resolution:2dppx)]:@min-[320px]:[image-rendering:pixelated] [@media(min-resolution:3dppx)]:@min-[214px]:[image-rendering:pixelated]";

/** A capture's pixels at its own aspect ratio, so nothing shifts while it loads. */
function Screen({
  media,
  sizes,
  decorative,
}: {
  media: Media;
  sizes: string;
  decorative: boolean;
}) {
  const alt = decorative ? "" : media.alt;
  const pixelated = media.kind === "image" && media.pixelated === true;
  const image = cn(
    "absolute inset-0 size-full object-contain",
    pixelated && PIXELATED,
  );
  return (
    <div
      className="@container relative"
      style={{ aspectRatio: `${media.width} / ${media.height}` }}
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
          <source src={media.src} type="video/mp4" />
        </video>
      )}
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

/**
 * One capture in the frame its `frame` names. `sizes` is the rendered width,
 * for picking an image size. `decorative` drops the alt text where something
 * else names the project.
 */
function ProjectMedia({
  media,
  sizes,
  decorative = false,
}: {
  media: Media;
  sizes: string;
  decorative?: boolean;
}) {
  const screen = <Screen media={media} sizes={sizes} decorative={decorative} />;
  switch (media.frame) {
    case "desktop":
    case "tv":
      return <div className={cn(SCREEN_FRAME, "rounded-[8px]")}>{screen}</div>;
    case "phone":
      return <PhoneFrame>{screen}</PhoneFrame>;
    default: {
      const unreachable: never = media.frame;
      return unreachable;
    }
  }
}

/**
 * A project's captures as one picture: the lead screen, with its phone capture
 * overlapping the lower right and its TV capture the lower left when there are
 * ones. Every length is in container units, so the composition scales as a
 * whole.
 */
export function MediaShowcase({
  showcase,
  sizes,
  className,
  style,
}: {
  showcase: Showcase;
  /** The composition's rendered width. */
  sizes: string;
  className?: string;
  style?: CSSProperties;
}) {
  switch (showcase.kind) {
    case "desktop":
      return (
        <div className={cn("@container relative", className)} style={style}>
          <div
            style={
              showcase.phone === null && showcase.tv === null
                ? undefined
                : { paddingBottom: `${Showcase.OVERHANG * 100}cqw` }
            }
          >
            <ProjectMedia media={showcase.lead} sizes={sizes} />
          </div>
          {showcase.tv !== null && (
            <div
              className="absolute bottom-0 left-[5cqw] drop-shadow-[0_18px_30px_#000000a6]"
              style={{ width: `${Showcase.TV_INSET * 100}cqw` }}
            >
              <ProjectMedia
                media={showcase.tv}
                sizes="(max-width: 640px) 35vw, 260px"
              />
            </div>
          )}
          {showcase.phone !== null && (
            <div className="absolute right-[5cqw] bottom-0 w-[20cqw] drop-shadow-[0_18px_30px_#000000a6]">
              <ProjectMedia
                media={showcase.phone}
                sizes="(max-width: 640px) 25vw, 180px"
              />
            </div>
          )}
        </div>
      );
    case "phone":
      return (
        <div className={cn("@container", className)} style={style}>
          <div
            className="mx-auto"
            style={{ width: `${Showcase.LONE_PHONE * 100}cqw` }}
          >
            <ProjectMedia
              media={showcase.phone}
              sizes="(max-width: 640px) 40vw, 320px"
            />
          </div>
        </div>
      );
    default: {
      const unreachable: never = showcase;
      return unreachable;
    }
  }
}
