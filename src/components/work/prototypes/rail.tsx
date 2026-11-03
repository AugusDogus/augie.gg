"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePlaying } from "~/components/flight-background";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { Button } from "~/components/ui/button";
import { Blurb } from "~/components/work/blurb";
import { framedAspect } from "~/components/work/project-media";
import type { Project } from "~/content/projects";
import { closeProject, openProject } from "~/lib/peek";
import { featuredProjects, yearOf } from "~/lib/projects";
import {
  Archive,
  ArchiveToggle,
  PanelHeader,
  ROW,
  useArchive,
} from "./archive";
import { NoMedia, hasCover } from "./no-media";
import { type RowProps, useRows } from "./rows";
import { Showcase, leadOf } from "./showcase";

/** A card's capture well: 16:10 with 6% padding all round, so its inner box is 0.88 by 0.505 of the width. */
const INNER = 0.505 / 0.88;

function CardWell({ project }: { project: Project }) {
  const lead = leadOf(project);
  if (lead === undefined)
    return hasCover(project) ? (
      <NoMedia project={project} size="compact" className="aspect-[16/10]" />
    ) : (
      <div className="aspect-[16/10]" />
    );
  const width = Math.min(1, INNER * framedAspect(lead));
  return (
    <div className="grid aspect-[16/10] place-items-center rounded-[10px] bg-[radial-gradient(120%_90%_at_50%_0%,#ffffff12,transparent_70%),linear-gradient(180deg,#0000001a,#00000038)] p-[6%] shadow-[inset_0_0_0_1px_#ffffff0f] transition-[box-shadow] duration-150 ease-out group-data-[lit=true]/card:shadow-[inset_0_0_0_1px_#ffffff2e] group-data-[open=true]/card:shadow-[inset_0_0_0_1px_#ffffff40] pointer-fine:group-hover/card:shadow-[inset_0_0_0_1px_#ffffff2e]">
      <div style={{ width: `${width * 100}%` }}>
        <Showcase
          project={project}
          lead={lead}
          sizes="(max-width: 480px) 80vw, 400px"
          decorative
        />
      </div>
    </div>
  );
}

/** One capture in the rail: a pointer shortcut to the row below, which is what keyboards and screen readers use. */
function RailCard({
  project,
  lit,
  open,
}: {
  project: Project;
  lit: boolean;
  open: boolean;
}) {
  const status = statusOf(project.labels);
  return (
    <button
      type="button"
      tabIndex={-1}
      data-card={project.title}
      data-lit={lit}
      data-open={open}
      onClick={() => {
        if (open) closeProject();
        else openProject(project.title);
      }}
      className="group/card w-[min(86%,420px,calc((100svh-150px)*1.6))] shrink-0 snap-start text-left"
    >
      <CardWell project={project} />
      <span className="mt-2 flex items-center gap-2 px-1 text-[13px]">
        {status && <StatusIcon status={status} />}
        <span className="text-fg truncate font-medium">{project.title}</span>
      </span>
    </button>
  );
}

function IndexRow({
  project,
  rowProps,
}: {
  project: Project;
  rowProps: RowProps;
}) {
  const status = statusOf(project.labels);
  return (
    <button
      {...rowProps}
      className={`${ROW} grid min-h-9 grid-cols-[14px_auto_minmax(0,1fr)_auto] items-center gap-x-3 text-[13.5px] max-[600px]:grid-cols-[14px_minmax(0,1fr)_auto] max-[600px]:gap-y-0.5 max-[600px]:py-2 pointer-coarse:min-h-10`}
    >
      <span className="flex size-3.5">
        {status && <StatusIcon status={status} />}
      </span>
      <span className="text-fg font-medium whitespace-nowrap">
        {project.title}
        {status && <span className="sr-only">, {STATUS_LABEL[status]}</span>}
      </span>
      <span className="text-fg-2 truncate max-[600px]:col-[2/4] max-[600px]:row-start-2 max-[600px]:whitespace-normal">
        {Blurb.plain(project.blurb)}
      </span>
      <span className="text-fg-3 col-start-4 row-start-1 text-[13px] tabular-nums max-[600px]:col-start-3">
        {yearOf(project)}
      </span>
    </button>
  );
}

type Edges = { start: boolean; end: boolean };

/**
 * Selected work as a rail of captures over a compact index. Swipe it on
 * touch, arrow through it with a mouse; pointing at or focusing a row brings
 * its capture into view.
 */
export function RailWork() {
  const [section, setSection] = useState<HTMLElement | null>(null);
  const { expanded, order, toggle } = useArchive(section);
  const { peek, rowProps } = useRows(order);
  const { reduced } = usePlaying();
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edges>({ start: true, end: false });
  const [lit, setLit] = useState<string | null>(null);
  const behavior = reduced ? "instant" : "smooth";

  function measure() {
    const element = rail.current;
    if (!element) return;
    const start = element.scrollLeft <= 1;
    const end =
      element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
    setEdges((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  }

  function watch(element: HTMLDivElement | null) {
    rail.current = element;
    if (!element) return undefined;
    const observer = new ResizeObserver(() => measure());
    observer.observe(element);
    return () => observer.disconnect();
  }

  function reveal(title: string) {
    const element = rail.current;
    const card = element?.querySelector<HTMLElement>(
      `[data-card="${CSS.escape(title)}"]`,
    );
    if (!element || !card) return;
    const view = element.getBoundingClientRect();
    const box = card.getBoundingClientRect();
    if (box.left >= view.left && box.right <= view.right) return;
    element.scrollBy({ left: box.left - view.left - 18, behavior });
  }

  // Stepping through projects in the peek walks the rail along with it.
  const follow = useEffectEvent((title: string) => reveal(title));
  useEffect(() => {
    if (peek !== null) follow(peek);
  }, [peek]);

  function step(direction: -1 | 1) {
    const element = rail.current;
    const card = element?.querySelector<HTMLElement>("[data-card]");
    if (!element || !card) return;
    element.scrollBy({ left: direction * (card.offsetWidth + 8), behavior });
  }

  return (
    <section
      ref={setSection}
      aria-labelledby="selected-work"
      className="material p-1.5"
    >
      <PanelHeader expanded={expanded}>
        <h2 id="selected-work" className="text-fg-2 text-[13px] font-medium">
          Selected work
        </h2>
        <div className="flex items-center gap-0.5">
          {/* Touch swipes the rail itself. */}
          <div className="mr-1 flex gap-0.5 pointer-coarse:hidden">
            <Button
              variant="icon"
              aria-label="Scroll captures left"
              aria-controls="rail"
              aria-disabled={edges.start}
              onClick={() => step(-1)}
              className="size-8 rounded-lg aria-disabled:pointer-events-none aria-disabled:opacity-35 [&_svg]:size-4"
            >
              <CaretLeftIcon aria-hidden="true" />
            </Button>
            <Button
              variant="icon"
              aria-label="Scroll captures right"
              aria-controls="rail"
              aria-disabled={edges.end}
              onClick={() => step(1)}
              className="size-8 rounded-lg aria-disabled:pointer-events-none aria-disabled:opacity-35 [&_svg]:size-4"
            >
              <CaretRightIcon aria-hidden="true" />
            </Button>
          </div>
          <ArchiveToggle expanded={expanded} onToggle={toggle} />
        </div>
      </PanelHeader>
      <div
        ref={watch}
        id="rail"
        data-rail
        data-start={edges.start}
        data-end={edges.end}
        tabIndex={-1}
        aria-hidden="true"
        onScroll={measure}
        className="-mx-1.5 flex snap-x snap-mandatory scroll-px-4.5 gap-2 overflow-x-auto overscroll-x-contain [mask-image:linear-gradient(90deg,transparent,#000_var(--fade-l),#000_calc(100%-var(--fade-r)),transparent)] px-4.5 pt-1 pb-3 outline-none [--fade-l:20px] [--fade-r:36px] [scrollbar-width:none] data-[end=true]:[--fade-r:0px] data-[start=true]:[--fade-l:0px] [&::-webkit-scrollbar]:hidden"
      >
        {featuredProjects.map((project) => (
          <RailCard
            key={project.title}
            project={project}
            lit={lit === project.title}
            open={peek === project.title}
          />
        ))}
      </div>
      <ul
        className="border-line flex flex-col border-t pt-1.5"
        onPointerLeave={() => setLit(null)}
      >
        {featuredProjects.map((project) => {
          const props = rowProps(project.title);
          return (
            <li
              key={project.title}
              onPointerEnter={() => {
                setLit(project.title);
                reveal(project.title);
              }}
            >
              <IndexRow
                project={project}
                rowProps={{
                  ...props,
                  onFocus: () => {
                    props.onFocus();
                    setLit(project.title);
                    reveal(project.title);
                  },
                }}
              />
            </li>
          );
        })}
      </ul>
      <Archive expanded={expanded} rowProps={rowProps} />
    </section>
  );
}
