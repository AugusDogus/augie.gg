"use client";

import { ProjectMedia } from "~/components/work/project-media";
import {
  ArrowUpRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  GitMergeIcon,
  LockSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Dialog } from "radix-ui";
import type { ReactNode, Ref } from "react";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Project } from "~/content/projects";
import { closeProject } from "~/lib/peek";
import { Destination, monthYear } from "./project-facts";
import { RichText } from "./rich-text";

const CHIP =
  "text-fg-2 inline-flex h-6 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] pr-2.5 pl-1.5 text-xs";
const ICON_BUTTON =
  "size-8 rounded-lg [&_svg]:size-4 pointer-coarse:size-10 aria-disabled:pointer-events-none aria-disabled:[&_svg]:opacity-35";

export function PeekHeader({
  project,
  previous,
  next,
  position,
  total,
  onStep,
}: {
  project: Project;
  previous: Project | null;
  next: Project | null;
  position: number | null;
  total: number;
  onStep: (target: Project | null) => void;
}) {
  const status = statusOf(project.labels);
  return (
    <div
      data-sheet-grip
      className="flex h-14 shrink-0 items-center gap-0.5 pr-3 pl-5"
    >
      {status ? (
        <span className={CHIP}>
          <StatusIcon status={status} />
          {STATUS_LABEL[status]}
        </span>
      ) : project.labels?.includes("oss") ? (
        <span className={CHIP}>
          <GitMergeIcon aria-hidden="true" className="size-3.5" />
          Open source
        </span>
      ) : null}
      {/* An open tooltip takes the first Esc, so it closes the peek too: one press, as the hint says. */}
      <div className="ml-auto flex items-center gap-0.5">
        {/* Touch has no footer, so its place in the list sits here, on phones wide enough for it beside the chip. */}
        {position !== null && (
          <span className="text-fg-3 mr-1.5 hidden text-xs whitespace-nowrap tabular-nums pointer-coarse:min-[360px]:inline">
            {position} of {total}
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="icon"
              className={ICON_BUTTON}
              aria-label="Previous project"
              aria-keyshortcuts="ArrowLeft"
              aria-disabled={previous === null}
              onClick={() => onStep(previous)}
            >
              <CaretLeftIcon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          {previous !== null && (
            <TooltipContent
              side="bottom"
              kbd="←"
              onEscapeKeyDown={closeProject}
            >
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
              onClick={() => onStep(next)}
            >
              <CaretRightIcon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          {next !== null && (
            <TooltipContent
              side="bottom"
              kbd="→"
              onEscapeKeyDown={closeProject}
            >
              Next
            </TooltipContent>
          )}
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Dialog.Close asChild>
              <Button
                variant="icon"
                className={ICON_BUTTON}
                aria-label="Close"
                aria-keyshortcuts="Escape"
              >
                <XIcon aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            kbd="Esc"
            onEscapeKeyDown={closeProject}
          >
            Close
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/** The project itself; keyed by title so stepping crossfades it in. */
export function PeekDetails({
  project,
  ref,
}: {
  project: Project;
  ref?: Ref<HTMLDivElement>;
}) {
  const started = monthYear(project.date);
  return (
    <div
      ref={ref}
      className="transition-[opacity,filter] duration-200 ease-out starting:opacity-0 starting:blur-[2px]"
    >
      <Dialog.Title className="text-fg text-[26px]/[1.15] font-semibold tracking-[-0.03em] text-balance wrap-anywhere">
        {project.title}
      </Dialog.Title>
      {started && (
        <p className="text-fg-3 mt-2 text-[13px]">Started {started}</p>
      )}
      <Dialog.Description className="text-fg mt-4 text-[15px]/[1.6] text-pretty">
        <RichText text={project.blurb} />
      </Dialog.Description>
      {project.highlight && (
        <p className="text-fg-2 border-accent/40 mt-4 border-l-2 pl-3.5 text-sm/[1.6] text-pretty">
          {project.highlight}
        </p>
      )}
      <DestinationAction destination={Destination.of(project)} />
      {project.media?.map((media) => (
        <ProjectMedia
          key={media.alt}
          media={media}
          sizes="(max-width: 640px) calc(100vw - 40px), 440px"
          className="mt-5"
        />
      ))}
    </div>
  );
}

function Visit({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      variant="primary"
      className="mt-6 pointer-coarse:h-10 pointer-coarse:px-4"
      asChild
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <ArrowUpRightIcon aria-hidden="true" />
      </a>
    </Button>
  );
}

function DestinationAction({ destination }: { destination: Destination }) {
  switch (destination.kind) {
    case "website":
      return <Visit href={destination.href}>Visit website</Visit>;
    case "repository":
      return <Visit href={destination.href}>View repository</Visit>;
    case "pull-request":
      return <Visit href={destination.href}>View pull request</Visit>;
    case "private":
      return (
        <p className="text-fg-3 mt-6 flex items-center gap-2 text-[13px]">
          <LockSimpleIcon aria-hidden="true" className="size-3.5" />
          Private repository
        </p>
      );
    case "none":
      return null;
    default: {
      const unreachable: never = destination;
      return unreachable;
    }
  }
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
    <div className="border-line text-fg-3 flex h-11 shrink-0 items-center gap-4 border-t px-5 text-xs pointer-coarse:hidden">
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
