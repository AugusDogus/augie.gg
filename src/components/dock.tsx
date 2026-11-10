"use client";

import { ArrowUpRightIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useEffect, useSyncExternalStore } from "react";
import { toggleAnimation, usePlaying } from "~/components/flight-background";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

const clock = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

function subscribeMinute(listener: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function tick() {
    listener();
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
  }
  timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
  document.addEventListener("visibilitychange", listener);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", listener);
  };
}

/** Pensacola's time, client-only so the server never renders a stale minute. */
function useLocalTime() {
  return useSyncExternalStore(
    subscribeMinute,
    () => clock.format(Date.now()),
    () => null,
  );
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input, textarea, select"))
  );
}

function Divider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("h-4 w-px shrink-0 bg-white/10", className)}
    />
  );
}

/**
 * Pinned bottom-right only once the pill clears the page's content column;
 * otherwise it closes the page, centered under that column.
 */
const COLUMN = {
  home: "max-w-[calc(600px+2*var(--gutter))] [@media(width>1000px)_and_(aspect-ratio>5/4)]:fixed [@media(width>1000px)_and_(aspect-ratio>5/4)]:right-[calc(var(--gutter)+var(--removed-body-scroll-bar-size,0px))] [@media(width>1000px)_and_(aspect-ratio>5/4)]:bottom-5 [@media(width>1000px)_and_(aspect-ratio>5/4)]:z-20 [@media(width>1000px)_and_(aspect-ratio>5/4)]:p-0",
  resume:
    "max-w-[calc(760px+2*var(--gutter))] min-[1240px]:fixed min-[1240px]:right-[calc(var(--gutter)+var(--removed-body-scroll-bar-size,0px))] min-[1240px]:bottom-5 min-[1240px]:z-20 min-[1240px]:p-0",
} as const;

export function Dock({ column = "home" }: { column?: keyof typeof COLUMN }) {
  const { playing, reduced } = usePlaying();
  const time = useLocalTime();
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (reduced || (event.key !== "p" && event.key !== "P")) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat)
        return;
      if (event.defaultPrevented || isTyping(event.target)) return;
      if (
        document.querySelector(
          '[role="dialog"]:not([aria-modal="false"]), [role="alertdialog"]',
        )
      )
        return;
      event.preventDefault();
      toggleAnimation();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reduced]);
  const label = reduced
    ? "Animation off (reduced motion)"
    : playing
      ? "Pause animation"
      : "Play animation";

  // Without the animation (reduced motion, or no script) the pill is just the credit.
  return (
    <footer
      className={cn(
        "flex justify-center px-(--gutter) pb-6 print:hidden",
        COLUMN[column],
      )}
    >
      <div className="material flex h-10 max-w-full items-center gap-3 rounded-full pr-3.5 pl-1 text-[12.5px] whitespace-nowrap motion-reduce:pl-3.5 max-[480px]:gap-2 max-[480px]:pr-3 max-[480px]:motion-reduce:pl-3 max-[420px]:text-[12px] noscript:pl-3.5 max-[480px]:noscript:pl-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={label}
              aria-disabled={reduced || undefined}
              aria-keyshortcuts={reduced ? undefined : "P"}
              onClick={() => {
                if (!reduced) toggleAnimation();
              }}
              className="text-fg-2 hover:text-fg relative -mr-1 grid size-8 place-items-center rounded-full transition-[background-color,color,scale] duration-150 ease-out before:absolute before:-inset-1 hover:bg-white/[.08] focus-visible:outline-offset-0 active:scale-[.97] aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100 motion-reduce:hidden noscript:hidden [&_svg]:size-4"
            >
              {playing ? (
                <PauseIcon weight="fill" aria-hidden="true" />
              ) : (
                <PlayIcon weight="fill" aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="start"
            alignOffset={-5}
            kbd={reduced ? undefined : "P"}
          >
            {label}
          </TooltipContent>
        </Tooltip>
        <Divider className="motion-reduce:hidden noscript:hidden" />
        <a
          href="https://www.gallerynucleus.com/detail/2126/"
          target="_blank"
          rel="noopener noreferrer"
          className="group text-fg-2 hover:text-fg relative inline-flex items-center gap-1 rounded-sm transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-3.5"
        >
          <span>
            <cite className="[font-synthesis:style]">Flight</cite> by Kazu
            Kibuishi
          </span>
          <ArrowUpRightIcon
            aria-hidden="true"
            className="text-fg-3 group-hover:text-fg-2 size-3 transition-colors duration-150 max-[480px]:hidden"
          />
        </a>
        {/* The narrowest phones keep the credit and drop the clock. */}
        <Divider className="max-[389px]:hidden noscript:hidden [@media(width>1000px)_and_(width<1180px)_and_(aspect-ratio>5/4)]:hidden" />
        <span
          aria-hidden={time === null || undefined}
          className={cn(
            "text-fg-2 tabular-nums transition-opacity duration-200 max-[389px]:hidden noscript:hidden [@media(width>1000px)_and_(width<1180px)_and_(aspect-ratio>5/4)]:hidden",
            time === null ? "opacity-0" : "opacity-100",
          )}
        >
          {time ?? "0:00 PM"} in Pensacola
        </span>
      </div>
    </footer>
  );
}
