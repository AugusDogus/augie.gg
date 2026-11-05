"use client";

import {
  ArrowUpRightIcon,
  GitMergeIcon,
  LockSimpleIcon,
} from "@phosphor-icons/react";
import type { ComponentType, ReactNode, Ref } from "react";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { Button } from "~/components/ui/button";
import type { Project } from "~/content/projects";
import { cn } from "~/lib/utils";
import { MediaShowcase } from "./project-media";
import { Destination, monthYear } from "./project-facts";
import { RichText } from "./rich-text";
import { Showcase } from "./showcase";

const CHIP =
  "text-fg-2 inline-flex h-6 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] pr-2.5 pl-1.5 text-xs";

type Slot = ComponentType<{
  id?: string;
  className?: string;
  children?: ReactNode;
}>;

function Heading(props: {
  id?: string;
  className?: string;
  children?: ReactNode;
}) {
  return <h2 {...props} />;
}

function Paragraph(props: { className?: string; children?: ReactNode }) {
  return <p {...props} />;
}

function Chip({ project }: { project: Project }) {
  const status = statusOf(project.labels);
  if (status)
    return (
      <span className={CHIP}>
        <StatusIcon status={status} />
        {STATUS_LABEL[status]}
      </span>
    );
  if (project.labels?.includes("oss"))
    return (
      <span className={CHIP}>
        <GitMergeIcon aria-hidden="true" className="size-3.5" />
        Open source
      </span>
    );
  return null;
}

/** In place of captures: the project's evidence line, set as type. Never an empty frame. */
function NoMedia({ highlight }: { highlight: string }) {
  return (
    <div className="flex flex-col justify-end rounded-[8px] bg-[radial-gradient(110%_120%_at_0%_100%,#8fe3f01a,transparent_55%),linear-gradient(180deg,#ffffff0a,#ffffff03)] p-5 shadow-[inset_0_0_0_1px_#ffffff12]">
      <p className="text-fg text-[17px]/[1.35] font-medium tracking-[-0.018em] text-balance">
        {highlight}
      </p>
    </div>
  );
}

function Visit({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      variant="primary"
      className="mt-5 pointer-coarse:h-10 pointer-coarse:px-4"
      asChild
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-control="destination"
      >
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
        <p className="text-fg-3 mt-5 flex items-center gap-2 text-[13px]">
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

/**
 * A project, the one way it is shown everywhere: its captures on top, then
 * status, title, start date, blurb, evidence, and where it lives. The stage
 * over the painting and the bottom sheet both hold exactly this.
 *
 * - `sizes` is the showcase's rendered width, for picking image sizes.
 * - `interactive` is whether the view takes input: in the sheet and on a
 *   pinned stage card, not on a hover preview. A board's viewer opens only then.
 * - `mediaHeight` caps the showcase's height (a CSS length), so the words
 *   below it always fit; the showcase narrows and centers to keep its shape.
 * - `actions` sits beside the title, such as the stage's step and close
 *   buttons.
 * - `Title` and `Description` render the title and blurb, so a dialog can
 *   pass its own labelling parts; `titleId` names the default heading.
 */
export function ProjectView({
  project,
  sizes,
  interactive,
  mediaHeight,
  actions,
  titleId,
  Title = Heading,
  Description = Paragraph,
  bodyRef,
}: {
  project: Project;
  sizes: string;
  interactive: boolean;
  mediaHeight?: string;
  actions?: ReactNode;
  titleId?: string;
  Title?: Slot;
  Description?: Slot;
  bodyRef?: Ref<HTMLDivElement>;
}) {
  const showcase = Showcase.of(project.media);
  // Without captures, the evidence line stands in for them.
  const cover = showcase === null ? (project.highlight ?? null) : null;
  // Tighter under a phone's overhang, which already leaves room, and with nothing above.
  const tight =
    (showcase?.kind === "desktop" &&
      (showcase.phone !== null || showcase.tv !== null)) ||
    (showcase === null && cover === null);
  const destination = Destination.of(project);
  const started = monthYear(project.date);
  return (
    <div className="p-1.5">
      {showcase !== null ? (
        <MediaShowcase
          showcase={showcase}
          sizes={sizes}
          interactive={interactive}
          className="mx-auto"
          style={
            mediaHeight === undefined
              ? undefined
              : {
                  maxWidth: `calc(${mediaHeight} * ${Showcase.aspect(showcase).toFixed(4)})`,
                }
          }
        />
      ) : (
        cover !== null && <NoMedia highlight={cover} />
      )}
      <div ref={bodyRef} className={cn("px-3 pb-3", tight ? "pt-2.5" : "pt-4")}>
        <Chip project={project} />
        <div className="mt-3 flex items-start gap-3 first:mt-0">
          <Title
            // Left out, not undefined, so a dialog's title keeps the id the dialog points at.
            {...(titleId === undefined ? {} : { id: titleId })}
            className="text-fg min-w-0 flex-1 text-[24px]/[1.15] font-semibold tracking-[-0.03em] text-balance wrap-anywhere"
          >
            {project.title}
          </Title>
          {actions}
        </div>
        {started && (
          <p className="text-fg-3 mt-1.5 text-[13px]">Started {started}</p>
        )}
        <Description className="text-fg mt-3.5 text-[15px]/[1.6] text-pretty">
          <RichText text={project.blurb} />
        </Description>
        {project.highlight && cover === null && (
          <p className="text-fg-2 border-accent/40 mt-3.5 border-l-2 pl-3.5 text-sm/[1.6] text-pretty">
            {project.highlight}
          </p>
        )}
        <DestinationAction destination={destination} />
      </div>
    </div>
  );
}
