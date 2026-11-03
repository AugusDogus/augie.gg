"use client";

import { useState } from "react";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { Blurb } from "~/components/work/blurb";
import { framedAspect } from "~/components/work/project-media";
import type { Project } from "~/content/projects";
import { archivedProjects, featuredProjects, yearOf } from "~/lib/projects";
import { Archive, ArchiveToggle, PanelHeader, useArchive } from "./archive";
import { NoMedia, hasCover } from "./no-media";
import { type RowProps, useRows } from "./rows";
import { Showcase, leadOf } from "./showcase";

/** The column's width less the card's padding, then the phone gutters below 640px. */
const SIZES = "(max-width: 640px) calc(100vw - 48px), 560px";

/** Each card settles in on its own: an animated ancestor would drop its glass blur. */
const SETTLE =
  "motion-safe:[:root:not([data-settled])_&]:animate-[settle_700ms_var(--ease-out)_both]";

function Well({ project }: { project: Project }) {
  const lead = leadOf(project);
  if (lead === undefined)
    return hasCover(project) ? <NoMedia project={project} /> : null;
  // A set reads smaller than a window at the same width; on short screens, nothing outgrows the view.
  const widest = lead.frame === "console" ? "78%" : "100%";
  const maxWidth = `min(${widest}, calc((100svh - 160px) * ${framedAspect(lead).toFixed(3)}))`;
  return (
    <div className="rounded-[10px] bg-[radial-gradient(120%_90%_at_50%_0%,#ffffff12,transparent_70%),linear-gradient(180deg,#0000001a,#00000038)] p-[clamp(10px,4.5%,24px)] shadow-[inset_0_0_0_1px_#ffffff0f]">
      <div className="mx-auto" style={{ maxWidth }}>
        <Showcase project={project} lead={lead} sizes={SIZES} overhang />
      </div>
    </div>
  );
}

function Card({
  project,
  index,
  rowProps,
}: {
  project: Project;
  index: number;
  rowProps: RowProps;
}) {
  const status = statusOf(project.labels);
  return (
    <li
      style={{ animationDelay: `${330 + index * 60}ms` }}
      className={`material group/card relative p-1.5 transition-[border-color] duration-150 ease-out has-[[aria-expanded=true]]:border-white/25 pointer-fine:hover:border-white/20 ${SETTLE}`}
    >
      <Well project={project} />
      <div className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 pt-3 pb-2.5 text-sm">
        <span className="flex size-3.5">
          {status && <StatusIcon status={status} />}
        </span>
        <h3 className="min-w-0">
          {/* The title is the card's button; its ::after stretches over the whole card. */}
          <button
            {...rowProps}
            className="text-fg focus-visible:after:outline-accent max-w-full scroll-mt-[min(60vh,480px)] scroll-mb-20 truncate text-left font-medium outline-none after:absolute after:inset-0 after:rounded-[14px] after:outline-offset-2 focus-visible:after:outline-2"
          >
            {project.title}
            {status && (
              <span className="sr-only">, {STATUS_LABEL[status]}</span>
            )}
          </button>
        </h3>
        <span className="text-fg-3 text-[13px] tabular-nums">
          {yearOf(project)}
        </span>
        <p className="text-fg-2 col-[2/4] text-pretty">
          {Blurb.plain(project.blurb)}
        </p>
      </div>
    </li>
  );
}

/**
 * Selected work as a stack of glass cards, each led by the project's capture;
 * recordings play while they're on screen. The rest of the catalog folds
 * into a panel underneath.
 */
export function CardsWork() {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const { expanded, order, toggle } = useArchive(panel);
  const { rowProps } = useRows(order);
  return (
    <section
      aria-labelledby="selected-work"
      className="flex animate-none flex-col gap-3"
    >
      <h2
        id="selected-work"
        className={`text-fg-2 px-4.5 pb-0.5 text-[13px] font-medium ${SETTLE} [animation-delay:330ms]`}
      >
        Selected work
      </h2>
      <ul className="flex flex-col gap-3">
        {featuredProjects.map((project, index) => (
          <Card
            key={project.title}
            project={project}
            index={index}
            rowProps={rowProps(project.title)}
          />
        ))}
      </ul>
      <div
        ref={setPanel}
        style={{ animationDelay: `${330 + featuredProjects.length * 60}ms` }}
        className={`material p-1.5 ${SETTLE}`}
      >
        <PanelHeader expanded={expanded}>
          <h3 className="text-fg-2 text-[13px] font-medium">Everything else</h3>
          <ArchiveToggle
            expanded={expanded}
            onToggle={toggle}
            label={`${archivedProjects.length} more`}
          />
        </PanelHeader>
        <Archive expanded={expanded} rowProps={rowProps} />
      </div>
    </section>
  );
}
