"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Project } from "~/content/projects";
import { closeProject, openProject, usePeek } from "~/lib/peek";
import { Catalog } from "./catalog";
import { PeekControls } from "./peek-content";
import { PeekFocus } from "./peek-focus";
import { PeekKeys } from "./peek-keys";
import { Preview, usePreview } from "./preview";
import { Showcase } from "./showcase";
import { ProjectView } from "./project-view";

/** Clear of the header's buttons above and the dock below. */
const TOP = 76;
const BOTTOM = 84;
const MAX_WIDTH = 800;
/** The view's padding and the card's border, around the showcase. */
const CHROME = 14;
/** The least height the showcase keeps on short screens; past that the card scrolls. */
const MIN_MEDIA = 140;
/** Narrowest card, so the words keep a comfortable measure beside a tall capture. */
const MIN_CARD = 380;
/** Widest card without captures: a measure for reading, not a picture. */
const TEXT_CARD = 520;
/**
 * Cards stay mounted after they leave, so coming back to one is instant and
 * its video resumes in place; past this many, the oldest unmounts and frees
 * its media.
 */
const KEPT = 8;

type Geometry = { left: number; width: number; gap: number; height: number };

function workList(): HTMLElement | null {
  return document.getElementById("selected-work")?.closest("section") ?? null;
}

/** Beside the list's column, out to the header's right edge, between the header and the dock. */
function measure(): Geometry {
  const list = workList()?.getBoundingClientRect();
  const gutter = list?.left ?? 24;
  const gap = Math.min(96, Math.max(32, window.innerWidth * 0.04));
  const left = (list?.right ?? gutter + 600) + gap;
  const right = document.documentElement.clientWidth - gutter;
  return {
    left,
    gap,
    width: Math.max(0, Math.min(MAX_WIDTH, right - left)),
    height: window.innerHeight - TOP - BOTTOM,
  };
}

/** The project's row, when it is on the page and not folded away. */
function rowFor(title: string): HTMLElement | null {
  const row = workList()?.querySelector(
    `[data-project="${CSS.escape(title)}"]`,
  );
  return row instanceof HTMLElement &&
    row.closest("[inert]") === null &&
    row.getClientRects().length > 0
    ? row
    : null;
}

function Layer({
  project,
  active,
  pinned,
  geometry,
  layerRef,
  onStep,
}: {
  project: Project;
  active: boolean;
  pinned: boolean;
  geometry: Geometry;
  layerRef: (element: HTMLDivElement | null) => () => void;
  onStep: (target: Project | null) => void;
}) {
  const titleId = useId();
  const [body, setBody] = useState(0);
  const sequence = Catalog.sequenceFor(project.title);
  const showcase = Showcase.of(project.media);
  // The showcase takes the height the words leave; the card hugs it. Narrowing
  // only ever makes the words taller, so measuring again settles in a step or two.
  const media = Math.max(MIN_MEDIA, geometry.height - body - CHROME);
  const width = Math.min(
    geometry.width,
    showcase === null
      ? TEXT_CARD
      : Math.max(
          MIN_CARD,
          Math.round(media * Showcase.aspect(showcase)) + CHROME,
        ),
  );

  /** The words' height, so the showcase above them can take the rest. */
  function measureBody(element: HTMLDivElement | null) {
    if (!element) return undefined;
    const observer = new ResizeObserver(() => setBody(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }

  return (
    <div
      ref={layerRef}
      role={pinned ? "dialog" : undefined}
      aria-modal={pinned ? false : undefined}
      aria-labelledby={pinned ? titleId : undefined}
      // Focusable whether pinned or not, so stepping never drops focus from a card on its way out.
      tabIndex={-1}
      data-active={active}
      onKeyDownCapture={(event) => {
        if (pinned) PeekFocus.leave(event, null, project.title);
      }}
      style={{ width, maxHeight: geometry.height }}
      className="material absolute top-0 left-0 hidden scale-[.985] overflow-y-auto overscroll-contain opacity-0 transition-[opacity,scale,display] transition-discrete duration-200 ease-out outline-none data-[active=true]:relative data-[active=true]:z-10 data-[active=true]:block data-[active=true]:scale-100 data-[active=true]:opacity-100 group-data-[shown=true]/stage:data-[active=true]:pointer-events-auto starting:data-[active=true]:scale-[.985] starting:data-[active=true]:opacity-0"
    >
      <ProjectView
        project={project}
        sizes={`${width - CHROME}px`}
        // The shown card takes the pointer, previewed or pinned, so a board's viewer opens on hover too.
        interactive={active}
        mediaHeight={`${media}px`}
        titleId={titleId}
        bodyRef={measureBody}
        actions={
          // Always laid out, so pinning never reflows the title; live only while pinned.
          <div
            inert={!pinned}
            data-pinned={pinned}
            className="-my-0.5 -mr-[11px] opacity-0 transition-opacity duration-150 ease-out data-[pinned=true]:opacity-100"
          >
            <PeekControls
              project={project}
              previous={Catalog.neighbor(sequence, project.title, -1)}
              next={Catalog.neighbor(sequence, project.title, 1)}
              onStep={onStep}
            />
          </div>
        }
      />
    </div>
  );
}

/**
 * The one place a project opens on wide screens with a mouse: beside the work
 * list, over the painting, riding alongside the project's row. Hovering or
 * focusing a row previews it here; clicking it, Enter, the command menu, or a
 * `?p=` link pins it, which adds step and close controls and the keys for
 * them. While a project is pinned, hovering other rows leaves it be.
 */
export function Stage() {
  const pinnedTitle = usePeek();
  const previewTitle = usePreview();
  const pinned =
    pinnedTitle === null ? null : (Catalog.find(pinnedTitle) ?? null);
  const previewed =
    previewTitle === null ? null : (Catalog.find(previewTitle) ?? null);
  const active = pinned ?? previewed;

  const root = useRef<HTMLDivElement>(null);
  const layers = useRef(new Map<string, HTMLDivElement>());
  const opener = useRef<Element | null>(null);
  const placed = useRef<string | null>(null);
  const last = useRef<string | null>(null);
  const [seen, setSeen] = useState<readonly Project[]>([]);
  const [geometry, setGeometry] = useState(measure);
  const [offscreen, setOffscreen] = useState(false);
  if (active !== null && !seen.includes(active))
    setSeen([...seen, active].slice(-KEPT));

  useEffect(() => {
    const update = () => setGeometry(measure());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Rows check where the stage is, to tell a pointer heading for it.
  useEffect(
    () =>
      Preview.target(() => {
        const element = root.current;
        if (element === null || element.dataset.shown !== "true") return null;
        const rect = element.getBoundingClientRect();
        return { left: rect.left, top: rect.top, bottom: rect.bottom };
      }),
    [],
  );

  // Alongside the row, clear of the header and dock; centered when the row is folded away.
  useLayoutEffect(() => {
    const element = root.current;
    if (active === null || !element) {
      placed.current = null;
      return undefined;
    }
    const title = active.title;
    const holding = pinned !== null;
    let frame = 0;
    function place() {
      const layer = layers.current.get(title);
      if (!layer || !element) return;
      const height = layer.offsetHeight;
      const room = window.innerHeight - BOTTOM;
      const rect = rowFor(title)?.getBoundingClientRect();
      const center =
        rect === undefined ? (TOP + room) / 2 : rect.top + rect.height / 2;
      const top = Math.max(TOP, Math.min(center - height / 2, room - height));
      // Appearing, it starts in place; moving between rows, it glides.
      if (placed.current === null) element.style.transition = "none";
      element.style.translate = `0 ${top}px`;
      if (placed.current === null) {
        void element.offsetHeight;
        element.style.removeProperty("transition");
      }
      placed.current = title;
      // A preview goes once its row scrolls out of view; a pinned project stays.
      setOffscreen(
        !holding &&
          (rect === undefined ||
            rect.bottom <= 0 ||
            rect.top >= window.innerHeight),
      );
    }
    place();
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const layer = layers.current.get(title);
    const observer = new ResizeObserver(schedule);
    if (layer) observer.observe(layer);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [active, pinned]);

  // Focus follows the pinned project: in from the command menu or a link,
  // over to the same control when stepping, back to the row when it closes.
  useLayoutEffect(() => {
    const from = last.current;
    const to = pinned?.title ?? null;
    last.current = to;
    if (from === to) return;
    const focused = document.activeElement;
    const was = from === null ? undefined : layers.current.get(from);
    const inside = was?.contains(focused) === true;
    if (to === null) {
      if (inside && focused instanceof HTMLElement && from !== null) {
        focused.blur();
        PeekFocus.restore(opener.current, from, "stage");
      }
      // Closed means gone, even though focus just landed back on a row.
      Preview.clear();
      opener.current = null;
      return;
    }
    const card = layers.current.get(to);
    if (!card) return;
    if (from === null) {
      opener.current = focused;
      // Clicked or Entered from its own row, focus stays there; from anywhere else, it comes here.
      const onRow =
        focused instanceof Element &&
        focused.getAttribute("data-project") === to;
      if (!onRow) card.focus({ preventScroll: true });
      return;
    }
    if (!inside) return;
    const control =
      focused instanceof HTMLElement ? focused.dataset.control : undefined;
    const twin =
      control === undefined
        ? null
        : card.querySelector<HTMLElement>(
            `[data-control="${CSS.escape(control)}"]`,
          );
    (twin ?? card).focus({ preventScroll: true });
  }, [pinned]);

  function step(target: Project | null) {
    if (target === null || pinned === null) return;
    openProject(target.title);
    PeekFocus.follow(pinned.title, target.title);
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (pinned === null) {
      // Esc puts away a preview the keyboard brought up.
      if (
        event.key === "Escape" &&
        previewed !== null &&
        !event.defaultPrevented
      )
        Preview.clear();
      return;
    }
    const card = layers.current.get(pinned.title) ?? null;
    if (!PeekKeys.claims(event, card)) return;
    if (event.key === "Tab") {
      PeekFocus.enter(event, card, pinned.title);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeProject();
      return;
    }
    const delta = PeekKeys.step(event);
    if (delta === null) return;
    const sequence = Catalog.sequenceFor(pinned.title);
    const target = Catalog.neighbor(sequence, pinned.title, delta);
    if (target === null) return;
    event.preventDefault();
    step(target);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  if (seen.length === 0) return null;
  const shown = active !== null && (pinned !== null || !offscreen);
  return createPortal(
    <div
      ref={root}
      data-shown={shown}
      onPointerEnter={() => Preview.hold()}
      onPointerLeave={() => Preview.leave(null)}
      style={{ left: geometry.left, width: geometry.width }}
      // Only the card and the bridge take the pointer, never the empty width beside a narrow card.
      className="group/stage pointer-events-none fixed top-0 z-30 opacity-0 transition-[opacity,translate] duration-[180ms,280ms] ease-out data-[shown=true]:opacity-100"
    >
      {/* Spans the gap from the list, so crossing it keeps the preview. */}
      <div
        aria-hidden="true"
        style={{ width: geometry.gap }}
        className="absolute inset-y-0 right-full group-data-[shown=true]/stage:pointer-events-auto"
      />
      {seen.map((project) => (
        <Layer
          key={project.title}
          project={project}
          active={project === active}
          pinned={project === pinned}
          geometry={geometry}
          onStep={step}
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
