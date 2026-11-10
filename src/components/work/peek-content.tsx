"use client";

import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  ExportIcon,
  LinkIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useCoarse } from "~/components/command-menu/platform";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Project } from "~/content/projects";
import { closeProject, usePeek } from "~/lib/peek";
import { DEFAULT_APP_TITLE } from "~/lib/site";
import { Share } from "./share";

const ICON_BUTTON =
  "size-8 rounded-lg [&_svg]:size-4 pointer-coarse:size-10 aria-disabled:pointer-events-none aria-disabled:[&_svg]:opacity-35";

/** What became of the link: on the clipboard, or not, which the button then says. */
type Shared = "idle" | "copied" | "failed";
/** A copy's outcome, and the project whose link it was. */
type Report = { title: string; outcome: Exclude<Shared, "idle"> };

const SHARED_LABEL: Readonly<Record<Shared, string>> = {
  idle: "Copy link",
  copied: "Link copied",
  failed: "Couldn’t copy the link. It’s in the address bar.",
};

/** Whether the visitor closed the share sheet without sending, which is no failure. */
function dismissed(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Hands over the link that opens this project, which previews with the
 * project's own card. A finger gets the system's share sheet, where there is
 * one; everything else copies the link and says so.
 */
function ShareControl({ project }: { project: Project }) {
  const coarse = useCoarse();
  const [report, setReport] = useState<Report | null>(null);
  const [hinted, setHinted] = useState(false);
  // Only while its project is the open one: not after a step, nor on a stage
  // card that has closed but stays mounted.
  const shared = report?.title === usePeek() ? report.outcome : "idle";
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function share() {
    const url = Share.link(project.title, window.location.origin);
    if (coarse && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${project.title} | ${DEFAULT_APP_TITLE}`,
          url,
        });
        return;
      } catch (error) {
        if (dismissed(error)) return;
        // The sheet would not open: the link can still be copied.
      }
    }
    let copied = true;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      copied = false;
    }
    clearTimeout(timer.current);
    setReport({ title: project.title, outcome: copied ? "copied" : "failed" });
    timer.current = setTimeout(() => setReport(null), copied ? 1800 : 5000);
  }

  return (
    <>
      {/* Held open while it reports a copy, so touch reads the outcome too. */}
      <Tooltip open={hinted || shared !== "idle"} onOpenChange={setHinted}>
        <TooltipTrigger asChild>
          <Button
            variant="icon"
            className={ICON_BUTTON}
            aria-label={coarse ? "Share" : "Copy link"}
            data-control="share"
            onClick={() => void share()}
          >
            <span className="copy-swap">
              <span data-active={shared !== "copied"}>
                {coarse ? (
                  <ExportIcon aria-hidden="true" />
                ) : (
                  <LinkIcon aria-hidden="true" />
                )}
              </span>
              <span data-active={shared === "copied"} className="text-live">
                <CheckIcon weight="bold" aria-hidden="true" />
              </span>
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" onEscapeKeyDown={closeProject}>
          {coarse && shared === "idle" ? "Share" : SHARED_LABEL[shared]}
        </TooltipContent>
      </Tooltip>
      <output aria-live="polite" className="sr-only">
        {shared === "idle" ? "" : SHARED_LABEL[shared]}
      </output>
    </>
  );
}

/**
 * Share, previous, next, and close for the open project. Each button names itself in
 * `data-control`, so focus can move to its twin when the project changes.
 */
export function PeekControls({
  project,
  previous,
  next,
  onStep,
}: {
  project: Project;
  previous: Project | null;
  next: Project | null;
  onStep: (target: Project | null) => void;
}) {
  // An open tooltip takes the first Esc, so it closes the project too: one press, as the hint says.
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <ShareControl project={project} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="icon"
            className={ICON_BUTTON}
            aria-label="Previous project"
            aria-keyshortcuts="ArrowLeft"
            aria-disabled={previous === null}
            data-control="previous"
            onClick={() => onStep(previous)}
          >
            <CaretLeftIcon aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        {previous !== null && (
          <TooltipContent side="bottom" kbd="←" onEscapeKeyDown={closeProject}>
            Previous
          </TooltipContent>
        )}
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="icon"
            className={ICON_BUTTON}
            aria-label="Next project"
            aria-keyshortcuts="ArrowRight"
            aria-disabled={next === null}
            data-control="next"
            onClick={() => onStep(next)}
          >
            <CaretRightIcon aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        {next !== null && (
          <TooltipContent side="bottom" kbd="→" onEscapeKeyDown={closeProject}>
            Next
          </TooltipContent>
        )}
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="icon"
            className={ICON_BUTTON}
            aria-label="Close"
            aria-keyshortcuts="Escape"
            data-control="close"
            onClick={closeProject}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" kbd="Esc" onEscapeKeyDown={closeProject}>
          Close
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Keyboard hints for fine pointers, with the project's place in its list. */
export function PeekFooter({
  position,
  total,
}: {
  position: number | null;
  total: number;
}) {
  return (
    <div className="border-line text-fg-3 flex h-11 shrink-0 items-center gap-4 border-t px-4.5 text-xs pointer-coarse:hidden">
      <span className="flex items-center gap-1.5">
        <kbd className="kbd">←</kbd>
        <kbd className="kbd">→</kbd>
        <span className="ml-0.5">Navigate</span>
      </span>
      <span className="flex items-center gap-1.5">
        <kbd className="kbd">Esc</kbd>
        <span className="ml-0.5">Close</span>
      </span>
      {position !== null && (
        <span className="ml-auto tabular-nums">
          {position} of {total}
        </span>
      )}
    </div>
  );
}
