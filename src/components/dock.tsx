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

export function Dock() {
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

  // Pinned bottom-right only once the pill clears the 600px content column;
  // otherwise it closes the page, centered under that column.
  return (
    <footer className="flex max-w-[calc(600px+2*var(--gutter))] justify-center px-(--gutter) pb-6 [@media(min-width:1180px)_and_(aspect-ratio>1200/874)]:fixed [@media(min-width:1180px)_and_(aspect-ratio>1200/874)]:right-[calc(var(--gutter)+var(--removed-body-scroll-bar-size,0px))] [@media(min-width:1180px)_and_(aspect-ratio>1200/874)]:bottom-5 [@media(min-width:1180px)_and_(aspect-ratio>1200/874)]:z-20 [@media(min-width:1180px)_and_(aspect-ratio>1200/874)]:p-0">
      <div className="material flex h-10 max-w-full items-center gap-3 rounded-full pr-3.5 pl-1 text-[12.5px] whitespace-nowrap max-[480px]:gap-2 max-[480px]:pr-3 max-[420px]:text-[12px]">
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
              className="text-fg-2 hover:text-fg relative -mr-1 grid size-8 place-items-center rounded-full transition-[background-color,color,scale] duration-150 ease-out before:absolute before:-inset-1 hover:bg-white/[.08] focus-visible:outline-offset-0 active:scale-[.97] aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100 motion-reduce:opacity-50 [&_svg]:size-4"
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
        <Divider />
        <a
          href="https://www.gallerynucleus.com/detail/2126/"
          target="_blank"
          rel="noopener noreferrer"
          className="group text-fg-2 hover:text-fg relative inline-flex items-center gap-1 rounded-sm transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-3.5"
        >
          “Flight” by Kazu Kibuishi
          <ArrowUpRightIcon
            aria-hidden="true"
            className="text-fg-3 group-hover:text-fg-2 size-3 transition-colors duration-150 max-[480px]:hidden"
          />
        </a>
        {/* The narrowest phones keep the credit and drop the clock. */}
        <Divider className="max-[389px]:hidden" />
        <span
          className={cn(
            "text-fg-2 tabular-nums transition-opacity duration-200 max-[389px]:hidden",
            time === null ? "opacity-0" : "opacity-100",
          )}
        >
          {time ?? "0:00 PM"} in Pensacola
        </span>
      </div>
    </footer>
  );
}
