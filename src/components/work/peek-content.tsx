"use client";

import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Project } from "~/content/projects";
import { closeProject } from "~/lib/peek";

const ICON_BUTTON =
  "size-8 rounded-lg [&_svg]:size-4 pointer-coarse:size-10 aria-disabled:pointer-events-none aria-disabled:[&_svg]:opacity-35";

/**
 * Previous, next, and close for the open project. Each button names itself in
 * `data-control`, so focus can move to its twin when the project changes.
 */
export function PeekControls({
  previous,
  next,
  onStep,
}: {
  previous: Project | null;
  next: Project | null;
  onStep: (target: Project | null) => void;
}) {
  // An open tooltip takes the first Esc, so it closes the project too: one press, as the hint says.
  return (
    <div className="flex shrink-0 items-center gap-0.5">
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
