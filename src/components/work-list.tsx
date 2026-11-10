"use client";

import { CaretDownIcon, LockSimpleIcon } from "@phosphor-icons/react";
import Image from "next/image";
import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { Blurb } from "~/components/work/blurb";
import { Catalog } from "~/components/work/catalog";
import { useStageLayout } from "~/components/work/layout";
import { Preview } from "~/components/work/preview";
import { SCREEN_FRAME } from "~/components/work/project-media";
import { Showcase } from "~/components/work/showcase";
import { Warm } from "~/components/work/warm";
import { rovingTarget } from "~/components/work/roving";
import type { Project } from "~/content/projects";
import { closeProject, openProject, usePeek } from "~/lib/peek";
import {
  archivedProjects,
  featuredProjects,
  groupByYear,
  yearOf,
} from "~/lib/projects";
import { cn } from "~/lib/utils";

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
  onFocus: (event: FocusEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
  onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

function toggle(title: string, open: boolean) {
  if (open) closeProject();
  else openProject(title);
}

/** The lead capture (a board's poster), cropped small, where rows can't preview on hover. */
function Thumb({ project }: { project: Project }) {
  const showcase = Showcase.of(project.media);
  if (showcase === null)
    return (
      <span className="text-fg-3 grid aspect-[16/10] w-full place-items-center rounded-[6px] bg-white/[.03] shadow-[inset_0_0_0_1px_#ffffff0f]">
        {project.private && (
          <LockSimpleIcon aria-hidden="true" className="size-3.5" />
        )}
      </span>
    );
  const cover = Showcase.cover(showcase);
  return (
    <span
      className={cn(SCREEN_FRAME, "block aspect-[16/10] w-full rounded-[6px]")}
    >
      <Image
        src={cover.src}
        alt=""
        width={cover.width}
        height={cover.height}
        sizes="72px"
        className="absolute inset-0 size-full object-cover object-top"
      />
    </span>
  );
}

function FeaturedRow({
  project,
  open,
  tabbable,
  rowRef,
  ...handlers
}: RowProps) {
  const status = statusOf(project.labels);
  const blurbId = useId();
  return (
    <button
      ref={rowRef}
      type="button"
      data-project={project.title}
      tabIndex={tabbable ? 0 : -1}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={
        status ? `${project.title}, ${STATUS_LABEL[status]}` : project.title
      }
      aria-describedby={blurbId}
      onClick={() => toggle(project.title, open)}
      {...handlers}
      className={`${ROW} flex items-start gap-3 py-2.5 text-sm max-[350px]:gap-2.5`}
    >
      {/* Narrower on small phones, so titles fit whole. */}
      <span className="stage:hidden mt-0.5 w-[72px] shrink-0 max-[400px]:w-14 max-[350px]:w-12">
        <Thumb project={project} />
      </span>
      <span className="stage:gap-x-3 grid min-w-0 flex-1 grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 max-[350px]:gap-x-1.5">
        <span className="flex size-3.5">
          {status && <StatusIcon status={status} />}
        </span>
        <span className="text-fg truncate font-medium">{project.title}</span>
        <span className="text-fg-3 col-start-3 row-start-1 text-[13px] tabular-nums">
          {yearOf(project)}
        </span>
        <span
          id={blurbId}
          className="text-fg-2 stage:col-[2/4] col-[1/4] row-start-2 text-pretty"
        >
          {Blurb.plain(project.blurb)}
        </span>
      </span>
    </button>
  );
}

function ArchiveRow({
  project,
  open,
  tabbable,
  rowRef,
  ...handlers
}: RowProps) {
  const blurbId = useId();
  return (
    <button
      ref={rowRef}
      type="button"
      data-project={project.title}
      tabIndex={tabbable ? 0 : -1}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={
        project.private ? `${project.title}, private repository` : project.title
      }
      aria-describedby={blurbId}
      onClick={() => toggle(project.title, open)}
      {...handlers}
      className={`${ROW} grid min-h-9 grid-cols-[14px_auto_minmax(0,1fr)_2rem] items-center gap-x-3 text-[13.5px] max-[600px]:grid-cols-[14px_minmax(0,1fr)_2rem] max-[600px]:gap-y-0.5 max-[600px]:py-2 pointer-coarse:min-h-10`}
    >
      <span className="text-fg col-start-2 flex min-w-0 items-center gap-1.5 font-medium whitespace-nowrap">
        <span className="truncate">{project.title}</span>
        {project.private && (
          <LockSimpleIcon
            aria-hidden="true"
            className="text-fg-3 size-3 shrink-0"
          />
        )}
      </span>
      <span
        id={blurbId}
        className="text-fg-2 truncate max-[600px]:col-start-2 max-[600px]:line-clamp-2 max-[600px]:whitespace-normal"
      >
        {Blurb.plain(project.blurb)}
      </span>
    </button>
  );
}

/**
 * Selected work as a keyboard-first list. Every row opens the project view:
 * on wide screens with a mouse, hovering or focusing a row previews it on the
 * stage and clicking pins it; elsewhere rows carry a thumbnail and open the
 * bottom sheet.
 */
export function WorkList() {
  const peek = usePeek();
  const stage = useStageLayout();
  const [expanded, setExpanded] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  /** The row keyboard focus previewed, so a pointer click's focus never hides the stage on blur. */
  const focusPreview = useRef<string | null>(null);
  // Where rows open the sheet, the featured projects' captures arrive ahead of a tap.
  useEffect(() => (stage ? undefined : Warm.featured()), [stage]);
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
      onFocus: (event) => {
        setFocused(title);
        if (!stage || !event.currentTarget.matches(":focus-visible")) return;
        focusPreview.current = title;
        Preview.enter(title, null);
      },
      onBlur: () => {
        if (focusPreview.current !== title) return;
        focusPreview.current = null;
        Preview.leave(null);
      },
      onPointerEnter: (event) => {
        if (stage && event.pointerType !== "touch")
          Preview.enter(title, { x: event.clientX, y: event.clientY });
      },
      onPointerLeave: (event) => {
        if (stage && event.pointerType !== "touch")
          Preview.leave({ x: event.clientX, y: event.clientY });
      },
      onKeyDown: (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        const target = rovingTarget(order, title, event.key);
        if (target === null) return;
        event.preventDefault();
        rows.current.get(target)?.focus();
        // With a project open, it follows the focused row, like a mail client.
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
            // Folding from deep in the archive brings the list back up, 12px clear of the top.
            const top = panel.current?.getBoundingClientRect().top ?? 0;
            if (expanded && top < 0) window.scrollBy({ top: top - 12 });
            setExpanded(!expanded);
          }}
          className="group text-fg-2 pointer-fine:hover:text-fg inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-[background-color,color,scale] duration-150 ease-out active:scale-[.97] pointer-coarse:h-10 pointer-fine:hover:bg-white/[.05] noscript:hidden"
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
        <div className="min-h-0 overflow-clip">
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
