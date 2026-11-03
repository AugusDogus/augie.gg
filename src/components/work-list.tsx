"use client";

import { CaretDownIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { type KeyboardEvent, type Ref, useRef, useState } from "react";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { Blurb } from "~/components/work/blurb";
import { Catalog } from "~/components/work/catalog";
import { rovingTarget } from "~/components/work/roving";
import type { Project } from "~/content/projects";
import { closeProject, openProject, usePeek } from "~/lib/peek";
import {
  archivedProjects,
  featuredProjects,
  groupByYear,
  yearOf,
} from "~/lib/projects";

const featuredTitles = featuredProjects.map((project) => project.title);
const allTitles = [
  ...featuredTitles,
  ...archivedProjects.map((project) => project.title),
];
const archive = groupByYear(archivedProjects);

/** Shared row chrome: instant hover on, a 150ms fade off, and a lit open row. */
const ROW =
  "w-full scroll-mt-12 rounded-[10px] px-3 text-left transition-[background-color] duration-150 ease-out -outline-offset-2 pointer-fine:hover:bg-white/[.05] pointer-fine:hover:duration-0 aria-expanded:bg-white/[.09] aria-expanded:shadow-[inset_0_0_0_1px_#ffffff17]";

type RowProps = {
  project: Project;
  open: boolean;
  tabbable: boolean;
  rowRef: Ref<HTMLButtonElement>;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

function toggle(title: string, open: boolean) {
  if (open) closeProject();
  else openProject(title);
}

function FeaturedRow({
  project,
  open,
  tabbable,
  rowRef,
  onFocus,
  onKeyDown,
}: RowProps) {
  const status = statusOf(project.labels);
  return (
    <button
      ref={rowRef}
      type="button"
      data-project={project.title}
      tabIndex={tabbable ? 0 : -1}
      aria-haspopup="dialog"
      aria-expanded={open}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onClick={() => toggle(project.title, open)}
      className={`${ROW} grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-2.5 text-sm`}
    >
      <span className="flex size-3.5">
        {status && <StatusIcon status={status} />}
      </span>
      <span className="text-fg font-medium whitespace-nowrap">
        {project.title}
        {status && <span className="sr-only">, {STATUS_LABEL[status]}</span>}
      </span>
      <span className="text-fg-2 col-[2/4] row-start-2 line-clamp-2 text-pretty">
        {Blurb.plain(project.blurb)}
      </span>
      <span className="text-fg-3 col-start-3 row-start-1 text-[13px] tabular-nums">
        {yearOf(project)}
      </span>
    </button>
  );
}

function ArchiveRow({
  project,
  open,
  tabbable,
  rowRef,
  onFocus,
  onKeyDown,
}: RowProps) {
  return (
    <button
      ref={rowRef}
      type="button"
      data-project={project.title}
      tabIndex={tabbable ? 0 : -1}
      aria-haspopup="dialog"
      aria-expanded={open}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onClick={() => toggle(project.title, open)}
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

/** Selected work as a keyboard-first list; every row opens the project peek. */
export function WorkList() {
  const peek = usePeek();
  const [expanded, setExpanded] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const panel = useRef<HTMLElement>(null);
  const order = expanded ? allTitles : featuredTitles;
  const tabStop =
    focused !== null && order.includes(focused) ? focused : order[0];

  function rowProps(project: Project): RowProps {
    const { title } = project;
    return {
      project,
      open: peek === title,
      tabbable: tabStop === title,
      rowRef: (element) => {
        if (element) rows.current.set(title, element);
        return () => {
          rows.current.delete(title);
        };
      },
      onFocus: () => setFocused(title),
      onKeyDown: (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        const target = rovingTarget(order, title, event.key);
        if (target === null) return;
        event.preventDefault();
        rows.current.get(target)?.focus();
        // With the peek open, it follows the focused row, like a mail client.
        if (peek !== null) openProject(target);
      },
    };
  }

  /** Watches the header's resting place; once that scrolls away, the pinned header needs a fill. */
  function watchHeader(sentinel: HTMLDivElement | null) {
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setStuck(entry.boundingClientRect.top < 0);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }

  return (
    <section
      ref={panel}
      aria-labelledby="selected-work"
      className="material p-1.5"
    >
      <div ref={watchHeader} />
      {/* Pinned while the archive is open, so it can be folded from anywhere. */}
      <div
        data-expanded={expanded}
        data-stuck={expanded && stuck}
        className="-mx-1.5 flex h-10 items-center justify-between pr-2 pl-4.5 data-[expanded=true]:sticky data-[expanded=true]:top-0 data-[expanded=true]:z-10 data-[stuck=true]:bg-[#132027] data-[stuck=true]:shadow-[0_1px_0_var(--color-line)]"
      >
        <h2 id="selected-work" className="text-fg-2 text-[13px] font-medium">
          Selected work
        </h2>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="archive"
          onClick={() => {
            // Folding from deep in the archive brings the list back up under the header.
            const top = panel.current?.getBoundingClientRect().top ?? 0;
            if (expanded && top < 0) window.scrollBy({ top });
            setExpanded(!expanded);
          }}
          className="group text-fg-2 pointer-fine:hover:text-fg inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-[background-color,color,scale] duration-150 ease-out active:scale-[.97] pointer-coarse:h-10 pointer-fine:hover:bg-white/[.05]"
        >
          All {Catalog.count} projects
          <CaretDownIcon
            aria-hidden="true"
            className="size-3 transition-transform duration-260 ease-out group-aria-expanded:rotate-180"
          />
        </button>
      </div>
      <ul className="flex flex-col">
        {featuredProjects.map((project) => (
          <li key={project.title}>
            <FeaturedRow {...rowProps(project)} />
          </li>
        ))}
      </ul>
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
              <section
                key={year}
                className="grid grid-cols-[minmax(0,1fr)_auto]"
              >
                {/* The featured rows' year column, carried down beside each group. */}
                <h3 className="text-fg-3 pointer-events-none sticky top-10 col-start-2 row-start-1 self-start pt-2 pr-3 text-[13px] leading-5 tabular-nums">
                  {year}
                </h3>
                <ul className="col-span-full row-start-1 flex min-w-0 flex-col">
                  {projects.map((project) => (
                    <li key={project.title}>
                      <ArchiveRow {...rowProps(project)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
