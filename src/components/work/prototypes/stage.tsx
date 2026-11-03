"use client";

import { LockSimpleIcon } from "@phosphor-icons/react";
import Image from "next/image";
import {
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { Blurb } from "~/components/work/blurb";
import { framedAspect } from "~/components/work/project-media";
import type { Media, Project } from "~/content/projects";
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
import { Showcase, leadOf, phoneOf } from "./showcase";

/** Wide layouts with the painting beside the list and a pointer that can hover. */
const STAGE_QUERY =
  "(min-width: 1180px) and (aspect-ratio > 1200/874) and (hover: hover) and (pointer: fine)";

function subscribeStage(listener: () => void) {
  const media = matchMedia(STAGE_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** Clear of the header's buttons above and the dock below. */
const TOP = 76;
const BOTTOM = 84;
/** Room for the caption under a capture. */
const CAPTION = 76;
const MAX_WIDTH = 860;

function Thumb({ project }: { project: Project }) {
  const media = leadOf(project);
  if (media === undefined)
    return (
      <span className="text-fg-3 grid aspect-[16/10] w-full place-items-center">
        {project.private && (
          <LockSimpleIcon aria-hidden="true" className="size-4" />
        )}
      </span>
    );
  return (
    <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-[7px] bg-[#05090b] shadow-[0_0_0_1px_#ffffff1f,0_1px_2px_#00000066]">
      <Image
        src={media.kind === "video" ? media.poster : media.src}
        alt=""
        width={media.width}
        height={media.height}
        sizes="80px"
        className="absolute inset-0 size-full object-cover object-top"
      />
    </span>
  );
}

function StageRow({
  project,
  rowProps,
  onPointer,
  onBlur,
}: {
  project: Project;
  rowProps: RowProps;
  /** Pointer enter and leave. */
  onPointer: (event: PointerEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
}) {
  const status = statusOf(project.labels);
  return (
    <button
      {...rowProps}
      onPointerEnter={onPointer}
      onPointerLeave={onPointer}
      onBlur={onBlur}
      className={`${ROW} flex items-start gap-3 py-2.5 text-sm max-[350px]:gap-2.5`}
    >
      {/* Thumbnails wherever the stage can't appear; narrower on small phones so titles fit whole. */}
      <span className="mt-0.5 w-[72px] shrink-0 max-[400px]:w-14 max-[350px]:w-12 [@media(min-width:1180px)_and_(aspect-ratio>1200/874)_and_(hover:hover)_and_(pointer:fine)]:hidden">
        <Thumb project={project} />
      </span>
      <span className="grid min-w-0 flex-1 grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 max-[350px]:gap-x-1.5 [@media(min-width:1180px)_and_(aspect-ratio>1200/874)_and_(hover:hover)_and_(pointer:fine)]:gap-x-3">
        <span className="flex size-3.5">
          {status && <StatusIcon status={status} />}
        </span>
        <span className="text-fg truncate font-medium">
          {project.title}
          {status && <span className="sr-only">, {STATUS_LABEL[status]}</span>}
        </span>
        <span className="text-fg-3 col-start-3 row-start-1 text-[13px] tabular-nums">
          {yearOf(project)}
        </span>
        <span className="text-fg-2 col-[1/4] row-start-2 text-pretty [@media(min-width:1180px)_and_(aspect-ratio>1200/874)_and_(hover:hover)_and_(pointer:fine)]:col-[2/4] [@media(min-width:1180px)_and_(aspect-ratio>1200/874)_and_(hover:hover)_and_(pointer:fine)]:line-clamp-2">
          {Blurb.plain(project.blurb)}
        </span>
      </span>
    </button>
  );
}

type Geometry = { left: number; maxWidth: number; maxHeight: number };

/** Beside the list's column, as wide as the painting allows, short enough to clear header and dock. */
function measure(section: HTMLElement): Geometry {
  const width = window.innerWidth;
  const gutter = Math.min(80, Math.max(24, width * 0.05));
  const gap = Math.min(96, Math.max(40, width * 0.04));
  const left = section.getBoundingClientRect().right + gap;
  return {
    left,
    maxWidth: Math.min(MAX_WIDTH, width - left - gutter),
    maxHeight: window.innerHeight - TOP - BOTTOM - CAPTION,
  };
}

function widthFor(media: Media, geometry: Geometry) {
  return Math.round(
    Math.min(geometry.maxWidth, geometry.maxHeight * framedAspect(media)),
  );
}

function Layer({
  project,
  active,
  geometry,
  layerRef,
}: {
  project: Project;
  active: boolean;
  geometry: Geometry;
  layerRef: (element: HTMLDivElement | null) => () => void;
}) {
  const lead = leadOf(project);
  const phone = phoneOf(project);
  const width =
    lead === undefined
      ? Math.min(420, geometry.maxWidth)
      : widthFor(lead, geometry);
  return (
    <div
      ref={layerRef}
      data-active={active}
      style={{ width }}
      className="absolute top-0 left-0 hidden scale-[.985] opacity-0 transition-[opacity,scale,display] transition-discrete duration-200 ease-out data-[active=true]:block data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:delay-50 starting:data-[active=true]:scale-[.985] starting:data-[active=true]:opacity-0"
    >
      {lead === undefined ? (
        <NoMedia project={project} className="material rounded-[14px]" />
      ) : (
        <>
          <Showcase
            project={project}
            lead={lead}
            sizes={`${width}px`}
            decorative
          />
          {/* Beside the phone's overhang, when there is one. */}
          {project.highlight && (
            <p
              className={`material text-fg-2 mt-3 w-fit rounded-[12px] px-3.5 py-2.5 text-[13px]/5 text-pretty ${phone ? "max-w-[73%]" : "max-w-full"}`}
            >
              {project.highlight}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The hovered or focused project's lead capture, large over the painting,
 * crossfading between projects and riding alongside its row. Decorative: the
 * rows and the peek carry the words.
 */
function Stage({
  section,
  active,
}: {
  section: HTMLElement;
  active: Project | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const layers = useRef(new Map<string, HTMLDivElement>());
  const [seen, setSeen] = useState<readonly Project[]>([]);
  const [geometry, setGeometry] = useState(() => measure(section));
  const [offscreen, setOffscreen] = useState(false);
  if (active !== null && !seen.includes(active)) setSeen([...seen, active]);

  useEffect(() => {
    const update = () => setGeometry(measure(section));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [section]);

  useLayoutEffect(() => {
    const element = container.current;
    if (active === null || !element) return undefined;
    const title = active.title;
    let frame = 0;
    function place() {
      const row = section.querySelector(
        `[data-project="${CSS.escape(title)}"]`,
      );
      const layer = layers.current.get(title);
      if (!row || !layer || !element) return;
      const rect = row.getBoundingClientRect();
      const height = layer.offsetHeight;
      const center = rect.top + rect.height / 2;
      const top = Math.min(
        Math.max(TOP, center - height / 2),
        window.innerHeight - BOTTOM - height,
      );
      element.style.translate = `0 ${Math.max(TOP, top)}px`;
      setOffscreen(rect.bottom < TOP || rect.top > window.innerHeight - BOTTOM);
    }
    place();
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [active, section]);

  const shown = active !== null && !offscreen;
  return createPortal(
    <div
      ref={container}
      aria-hidden="true"
      data-shown={shown}
      style={{ left: geometry.left, width: geometry.maxWidth }}
      className="pointer-events-none fixed top-0 z-30 opacity-0 transition-[opacity,translate] duration-[180ms,280ms] ease-out data-[shown=true]:opacity-100"
    >
      {seen.map((project) => (
        <Layer
          key={project.title}
          project={project}
          active={project === active}
          geometry={geometry}
          layerRef={(element) => {
            if (element) layers.current.set(project.title, element);
            return () => {
              layers.current.delete(project.title);
            };
          }}
        />
      ))}
    </div>,
    document.body,
  );
}

/** Pointer intent: a short wait before the stage first appears, none to switch, a beat before it goes. */
const SHOW_MS = 80;
const HIDE_MS = 160;

/**
 * Selected work as an index. On wide screens with a mouse, hovering or
 * focusing a project stages its capture over the painting; elsewhere each row
 * carries a thumbnail. Every row opens the peek.
 */
export function StageWork() {
  const [section, setSection] = useState<HTMLElement | null>(null);
  const { expanded, order, toggle } = useArchive(section);
  const { peek, rowProps } = useRows(order);
  const staging = useSyncExternalStore(
    subscribeStage,
    () => matchMedia(STAGE_QUERY).matches,
    () => false,
  );
  const [target, setTarget] = useState<Project | null>(null);
  const [showing, setShowing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function present(project: Project | null, immediately: boolean) {
    clearTimeout(timer.current);
    if (project === null) {
      timer.current = setTimeout(() => setShowing(false), HIDE_MS);
      return;
    }
    setTarget(project);
    if (showing || immediately) setShowing(true);
    else timer.current = setTimeout(() => setShowing(true), SHOW_MS);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const staged =
    staging &&
    showing &&
    peek === null &&
    target !== null &&
    (target.media !== undefined || hasCover(target))
      ? target
      : null;

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
        <ArchiveToggle expanded={expanded} onToggle={toggle} />
      </PanelHeader>
      <ul className="flex flex-col">
        {featuredProjects.map((project) => {
          const props = rowProps(project.title);
          return (
            <li key={project.title}>
              <StageRow
                project={project}
                rowProps={{
                  ...props,
                  onFocus: () => {
                    props.onFocus();
                    const row = document.activeElement;
                    // Keyboard focus stages the project; a click opens the peek instead.
                    if (
                      row instanceof HTMLElement &&
                      row.matches(":focus-visible")
                    )
                      present(project, true);
                  },
                }}
                onPointer={(event) => {
                  if (event.pointerType === "touch") return;
                  present(
                    event.type === "pointerenter" ? project : null,
                    false,
                  );
                }}
                onBlur={() => present(null, false)}
              />
            </li>
          );
        })}
      </ul>
      <Archive expanded={expanded} rowProps={rowProps} />
      {staging && section && <Stage section={section} active={staged} />}
    </section>
  );
}
