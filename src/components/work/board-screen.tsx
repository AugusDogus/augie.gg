"use client";

import Image from "next/image";
import {
  type MouseEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Board } from "~/content/projects";

/** The viewer page (public/kicad-viewer/embed.html), on this board's files. */
function viewerUrl(board: Board): string {
  const params = new URLSearchParams({
    model: board.model,
    pcb: board.pcb,
    schematic: board.schematic,
  });
  if (board.note !== undefined) params.set("note", board.note);
  return `/kicad-viewer/embed.html?${params}`;
}

/** The glass of the controls laid over the frame, matching the viewer's own. */
const OVERLAY =
  "border border-white/10 bg-[linear-gradient(180deg,#16232ad9,#0d171ceb)] shadow-[inset_0_1px_0_#ffffff12,0_1px_2px_#00000040,0_8px_24px_-8px_#00000080] backdrop-blur-[16px] backdrop-saturate-[1.4]";

/**
 * Phosphor's regular Cube, CornersOut, CornersIn, and ArrowSquareOut, inline:
 * its components carry all six weights each, which every visit to the home
 * page would load for a viewer few open.
 */
const GLYPHS = {
  cube: "M223.68,66.15,135.68,18h0a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32h0l80.34,44L128,120,47.66,76ZM40,90l80,43.78v85.79L40,175.82Zm96,129.57V133.82L216,90v85.78Z",
  expand:
    "M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm120-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160ZM88,40H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16Z",
  collapse:
    "M152,96V48a8,8,0,0,1,16,0V88h40a8,8,0,0,1,0,16H160A8,8,0,0,1,152,96ZM96,152H48a8,8,0,0,0,0,16H88v40a8,8,0,0,0,16,0V160A8,8,0,0,0,96,152Zm112,0H160a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V168h40a8,8,0,0,0,0-16ZM96,40a8,8,0,0,0-8,8V88H48a8,8,0,0,0,0,16H96a8,8,0,0,0,8-8V48A8,8,0,0,0,96,40Z",
  away: "M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z",
} as const;

function Glyph({
  name,
  className,
}: {
  name: keyof typeof GLYPHS;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d={GLYPHS[name]} />
    </svg>
  );
}

function subscribeNothing() {
  return () => undefined;
}

/** Whether this browser lets an element take the screen; iPhone Safari does not. */
function useFullscreenAvailable(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => document.fullscreenEnabled,
    () => true,
  );
}

/** Full screen for the viewer, or where there is none, the viewer on its own page. */
function Expand({
  url,
  fullscreen,
  onToggle,
}: {
  url: string;
  fullscreen: boolean;
  onToggle: () => void;
}) {
  const available = useFullscreenAvailable();
  const className = `${OVERLAY} text-fg-2 hover:text-fg absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-[10px] transition-[color,scale] duration-150 ease-out active:scale-[.94] pointer-coarse:size-10 max-[400px]:top-2 max-[400px]:right-2 [&_svg]:size-4`;
  const label = available
    ? fullscreen
      ? "Exit full screen"
      : "Full screen"
    : "Open in a new tab";
  return (
    // Not hoverable: the frame takes the pointer events that would close it.
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        {available ? (
          <button
            type="button"
            aria-label={label}
            onClick={onToggle}
            className={className}
          >
            <Glyph name={fullscreen ? "collapse" : "expand"} />
          </button>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener"
            aria-label={label}
            className={className}
          >
            <Glyph name="away" />
          </a>
        )}
      </TooltipTrigger>
      {/* In full screen only the viewer shows, so a tooltip has nowhere to appear. */}
      {!fullscreen && (
        <TooltipContent side="left" sideOffset={6}>
          {label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

/**
 * The board's viewer in its frame: a sandboxed page with the 3D model, PCB,
 * and schematic. Unmounting it drops the page and its WebGL context.
 *
 * `frame` is the box it fills, which goes full screen. `focus` is where focus
 * lands as it opens: into the viewer's tabs, or on the frame, so the card's
 * keys keep working.
 */
function Viewer({
  board,
  frame,
  focus,
}: {
  board: Board;
  frame: HTMLDivElement;
  focus: "viewer" | "frame";
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const focused = useRef(false);
  const url = viewerUrl(board);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === frame);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [frame]);

  function toggleFullscreen() {
    if (document.fullscreenElement === frame) {
      void document.exitFullscreen();
      return;
    }
    // A refused request (no user gesture, a policy) leaves the viewer as it was.
    frame.requestFullscreen().catch(() => undefined);
  }

  return (
    <>
      <iframe
        ref={(element) => {
          if (!element || focused.current) return;
          focused.current = true;
          if (focus === "viewer") element.focus();
          else frame.focus({ preventScroll: true });
        }}
        src={url}
        title="Board viewer: 3D model, PCB, and schematic"
        // Prism needs its own origin for its parser worker, module scripts,
        // and storage; the frame gets nothing else (no popups, forms, or top
        // navigation). Same-origin scripts could lift the sandbox, but every
        // file it runs is this site's own.
        // oxlint-disable-next-line react/iframe-missing-sandbox
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        className="absolute inset-0 size-full border-0 [color-scheme:dark]"
      />
      <Expand url={url} fullscreen={fullscreen} onToggle={toggleFullscreen} />
    </>
  );
}

/**
 * A circuit board in the shared frame: its poster, and once someone asks, an
 * interactive viewer of its 3D model, PCB, and schematic in the same box, so
 * nothing shifts. The viewer is a sandboxed page created only then; until
 * that, the page loads nothing for it.
 *
 * `interactive` is whether the card takes input (pinned on the stage, or in
 * the sheet). A hover preview shows the poster alone, and a card that stops
 * taking input drops the viewer, which frees its WebGL context.
 */
export function BoardScreen({
  board,
  sizes,
  interactive,
}: {
  board: Board;
  sizes: string;
  interactive: boolean;
}) {
  /** Closed, or open with where focus lands as it replaces the control. */
  const [open, setOpen] = useState<"viewer" | "frame" | null>(null);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  if (open !== null && !interactive) setOpen(null);

  function explore(event: MouseEvent<HTMLButtonElement>) {
    // From the keyboard, into the viewer's tabs; from a pointer, the card keeps its keys.
    setOpen(event.currentTarget.matches(":focus-visible") ? "viewer" : "frame");
  }

  return (
    <div
      ref={setFrame}
      tabIndex={-1}
      className="@container relative outline-none [&:fullscreen]:bg-[#0a1317]"
      style={{ aspectRatio: `${board.width} / ${board.height}` }}
    >
      <Image
        src={board.poster}
        alt={board.alt}
        width={board.width}
        height={board.height}
        sizes={sizes}
        className="absolute inset-0 size-full object-contain"
      />
      {open !== null && frame !== null ? (
        <Viewer board={board} frame={frame} focus={open} />
      ) : (
        interactive && (
          // The whole poster takes the click; the pill shows where.
          <button
            type="button"
            onClick={explore}
            aria-label="Explore in 3D, with the PCB and schematic"
            className="group absolute inset-0 rounded-[inherit] -outline-offset-2 transition-opacity duration-200 ease-out starting:opacity-0"
          >
            <span
              className={`${OVERLAY} text-fg absolute bottom-2.5 left-2.5 inline-flex h-8 items-center gap-2 rounded-[10px] pr-3 pl-2.5 text-[13px] font-medium transition-[background-color,scale] duration-150 ease-out group-active:scale-[.97] max-[400px]:bottom-2 max-[400px]:left-2 pointer-coarse:h-10 pointer-coarse:pr-3.5 pointer-coarse:pl-3 pointer-fine:group-hover:bg-[#213038] [&_svg]:size-4`}
            >
              <Glyph name="cube" className="text-accent" />
              Explore in 3D
            </span>
          </button>
        )
      )}
    </div>
  );
}
