"use client";

import { CaretDownIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { Blurb } from "~/components/work/blurb";
import { Catalog } from "~/components/work/catalog";
import type { Project } from "~/content/projects";
import {
  archivedProjects,
  featuredProjects,
  groupByYear,
} from "~/lib/projects";
import type { RowProps } from "./rows";

const archive = groupByYear(archivedProjects);
const featuredTitles = featuredProjects.map((project) => project.title);
const allTitles = [
  ...featuredTitles,
  ...archivedProjects.map((project) => project.title),
];

/** Shared row chrome from WorkList: instant hover on, a 150ms fade off, a lit open row. */
export const ROW =
  "w-full scroll-mt-12 rounded-[10px] px-3 text-left transition-[background-color] duration-150 ease-out -outline-offset-2 pointer-fine:hover:bg-white/[.05] pointer-fine:hover:duration-0 aria-expanded:bg-white/[.09] aria-expanded:shadow-[inset_0_0_0_1px_#ffffff17]";

/** The folded archive's state; its rows join the featured ones in keyboard order once open. */
export function useArchive(panel: HTMLElement | null) {
  const [expanded, setExpanded] = useState(false);
  return {
    expanded,
    order: expanded ? allTitles : featuredTitles,
    toggle: () => {
      // Folding from deep in the archive brings the list back up under the header.
      const top = panel?.getBoundingClientRect().top ?? 0;
      if (expanded && top < 0) window.scrollBy({ top });
      setExpanded(!expanded);
    },
  };
}

export function ArchiveToggle({
  expanded,
  onToggle,
  label = `All ${Catalog.count} projects`,
}: {
  expanded: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls="archive"
      onClick={onToggle}
      className="group text-fg-2 pointer-fine:hover:text-fg inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] whitespace-nowrap transition-[background-color,color,scale] duration-150 ease-out active:scale-[.97] pointer-coarse:h-10 pointer-fine:hover:bg-white/[.05]"
    >
      {label}
      <CaretDownIcon
        aria-hidden="true"
        className="size-3 transition-transform duration-260 ease-out group-aria-expanded:rotate-180"
      />
    </button>
  );
}

/** A panel header that pins while the archive is open, so it can be folded from anywhere. */
export function PanelHeader({
  expanded,
  children,
}: {
  expanded: boolean;
  children: ReactNode;
}) {
  const [stuck, setStuck] = useState(false);

  /** Watches the header's resting place; once that scrolls away, the pinned header needs a fill. */
  function watch(sentinel: HTMLDivElement | null) {
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setStuck(entry.boundingClientRect.top < 0);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }

  return (
    <>
      <div ref={watch} />
      <div
        data-expanded={expanded}
        data-stuck={expanded && stuck}
        className="-mx-1.5 flex h-10 items-center justify-between gap-2 pr-2 pl-4.5 data-[expanded=true]:sticky data-[expanded=true]:top-0 data-[expanded=true]:z-10 data-[stuck=true]:bg-[#132027] data-[stuck=true]:shadow-[0_1px_0_var(--color-line)]"
      >
        {children}
      </div>
    </>
  );
}

function ArchiveRow({
  project,
  rowProps,
}: {
  project: Project;
  rowProps: RowProps;
}) {
  return (
    <button
      {...rowProps}
      className={`${ROW} grid min-h-9 grid-cols-[14px_auto_minmax(0,1fr)_2rem] items-center gap-x-3 text-[13.5px] max-[600px]:grid-cols-[14px_minmax(0,1fr)_2rem] max-[600px]:gap-y-0.5 max-[600px]:py-2 pointer-coarse:min-h-10`}
    >
      <span className="text-fg col-start-2 flex items-center gap-1.5 font-medium whitespace-nowrap">
        {project.title}
        {project.private && (
          <>
            <LockSimpleIcon
              aria-hidden="true"
              className="text-fg-3 size-3 shrink-0"
            />
            <span className="sr-only">, private repository</span>
          </>
        )}
      </span>
      <span className="text-fg-2 truncate max-[600px]:col-start-2 max-[600px]:line-clamp-2 max-[600px]:whitespace-normal">
        {Blurb.plain(project.blurb)}
      </span>
    </button>
  );
}

/** Everything else, by year, folded under the featured projects. */
export function Archive({
  expanded,
  rowProps,
}: {
  expanded: boolean;
  rowProps: (title: string) => RowProps;
}) {
  return (
    <div
      id="archive"
      data-expanded={expanded}
      inert={!expanded}
      className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-260 ease-out data-[expanded=true]:grid-rows-[1fr]"
    >
      {/* Relative, so the clip also holds the rows' absolute sr-only text; folded, it would stretch the page. */}
      <div className="relative min-h-0 overflow-clip">
        <div className="border-line mt-1.5 flex flex-col gap-2 border-t pt-1.5">
          {archive.map(({ year, projects }) => (
            <section key={year} className="grid grid-cols-[minmax(0,1fr)_auto]">
              <h3 className="text-fg-3 pointer-events-none sticky top-10 col-start-2 row-start-1 self-start pt-2 pr-3 text-[13px] leading-5 tabular-nums">
                {year}
              </h3>
              <ul className="col-span-full row-start-1 flex min-w-0 flex-col">
                {projects.map((project) => (
                  <li key={project.title}>
                    <ArchiveRow
                      project={project}
                      rowProps={rowProps(project.title)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
