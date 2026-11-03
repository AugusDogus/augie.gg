"use client";

import { Dialog } from "radix-ui";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePlaying } from "~/components/flight-background";
import { Catalog } from "~/components/work/catalog";
import {
  PeekDetails,
  PeekFooter,
  PeekHeader,
} from "~/components/work/peek-content";
import { PeekFocus } from "~/components/work/peek-focus";
import { useSheetDrag } from "~/components/work/use-sheet-drag";
import type { Project } from "~/content/projects";
import { closeProject, openProject, usePeek } from "~/lib/peek";

/**
 * Phones and narrow or tall windows, where the painting sits above the content,
 * and windows too narrow to fit the 600px list and a 340px peek side by side.
 */
const SHEET_QUERY = "(max-width: 1080px), (max-aspect-ratio: 5/4)";

function subscribeLayout(listener: () => void) {
  const media = matchMedia(SHEET_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** Exit durations; the sheet stays mounted until its transition finishes. */
const EXIT_MS = { side: 160, sheet: 300 } as const;

/**
 * The open project: a non-modal side sheet over the painting on wide screens,
 * a modal bottom sheet with drag-to-dismiss on phones.
 */
export function ProjectPeek() {
  const title = usePeek();
  const project = title === null ? undefined : Catalog.find(title);
  const sheet = useSyncExternalStore(
    subscribeLayout,
    () => matchMedia(SHEET_QUERY).matches,
    () => false,
  );
  const { reduced } = usePlaying();
  const [last, setLast] = useState<Project | null>(null);
  if (project !== undefined && project !== last) setLast(project);
  const open = project !== undefined;

  useEffect(() => {
    const timer =
      open || last === null
        ? undefined
        : setTimeout(
            () => setLast(null),
            reduced ? 0 : EXIT_MS[sheet ? "sheet" : "side"],
          );
    return () => clearTimeout(timer);
  }, [open, last, reduced, sheet]);

  const shown = project ?? last;
  if (shown === null) return null;
  return <Peek project={shown} open={open} sheet={sheet} />;
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest("input, textarea, select") !== null)
  );
}

function Peek({
  project,
  open,
  sheet,
}: {
  project: Project;
  open: boolean;
  sheet: boolean;
}) {
  const content = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [scrollable, setScrollable] = useState(false);
  const sequence = Catalog.sequenceFor(project.title);
  const previous = Catalog.neighbor(sequence, project.title, -1);
  const next = Catalog.neighbor(sequence, project.title, 1);
  const position = Catalog.position(sequence, project.title);
  const { body, backdrop, handlers } = useSheetDrag(closeProject);

  function step(target: Project | null) {
    if (target === null) return;
    // The details are swapped out; keep focus in the sheet rather than losing it to the page.
    if (body.current?.contains(document.activeElement))
      content.current?.focus({ preventScroll: true });
    openProject(target.title);
    // The modal sheet covers the list; closing it focuses the row instead.
    if (!sheet) PeekFocus.follow(project.title, target.title);
  }

  /** Lets touches pan the body only when it overflows; otherwise they drag the sheet. */
  function measure(details: HTMLDivElement | null) {
    const scroller = details?.parentElement;
    if (!details || !scroller) return undefined;
    const observer = new ResizeObserver(() =>
      setScrollable(scroller.scrollHeight > scroller.clientHeight + 1),
    );
    observer.observe(details);
    observer.observe(scroller);
    return () => observer.disconnect();
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!open || event.defaultPrevented || isTyping(event.target)) return;
    if (!sheet && event.key === "Tab") {
      PeekFocus.enter(event, content.current, project.title);
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // Leave keys alone inside other dialogs, such as the command menu.
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('[role="dialog"]') !== null &&
      !content.current?.contains(target)
    )
      return;
    const destination =
      event.key === "ArrowLeft" || event.key === "k"
        ? previous
        : event.key === "ArrowRight" || event.key === "j"
          ? next
          : null;
    if (destination === null) return;
    event.preventDefault();
    step(destination);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  const phase = open ? "open" : "closed";

  return (
    <Dialog.Root
      open
      modal={sheet}
      onOpenChange={(value) => {
        if (!value) closeProject();
      }}
    >
      <Dialog.Portal>
        {sheet && (
          // .material without its look: the flight engine ignores pointers over it, so the scrim never stirs the painting.
          <Dialog.Overlay
            ref={backdrop}
            data-phase={phase}
            className="material fixed inset-0 z-40 rounded-none border-0 bg-[#00000066] bg-none shadow-none backdrop-filter-none transition-opacity duration-300 ease-out data-[phase=closed]:opacity-0 starting:opacity-0"
          />
        )}
        <Dialog.Content
          ref={content}
          aria-modal={sheet}
          data-phase={phase}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            opener.current = document.activeElement;
            content.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            PeekFocus.restore(
              opener.current,
              project.title,
              sheet ? "sheet" : "side",
            );
          }}
          onInteractOutside={(event) => {
            // Wide screens keep the sheet open beside the page; rows switch it.
            if (!sheet) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            // A day picked in the contribution graph is dismissed first.
            const target = event.target;
            if (
              target instanceof Element &&
              !content.current?.contains(target) &&
              target.closest('[role="application"][data-selecting]') !== null
            )
              event.preventDefault();
          }}
          onKeyDownCapture={
            sheet
              ? undefined
              : (event) => PeekFocus.leave(event, opener.current, project.title)
          }
          {...(sheet ? handlers : {})}
          data-media={project.media !== undefined || undefined}
          className={
            sheet
              ? // Runs 4rem (Drag.UPWARD_LIMIT) past the viewport, so lifting it shows more glass, not a seam; its top clears the header.
                "material ease-drawer fixed inset-x-0 -bottom-16 z-40 mx-auto flex max-h-[calc(100dvh-72px+4rem)] min-h-[calc(min(404px,100dvh-72px)+4rem)] max-w-[640px] [translate:0_var(--drag,0px)] touch-none flex-col rounded-t-2xl rounded-b-none border-b-0 pb-[calc(env(safe-area-inset-bottom)+4rem)] transition-[translate] duration-300 outline-none data-dragging:transition-none data-[phase=closed]:translate-y-full starting:translate-y-full pointer-coarse:min-h-[calc(min(400px,100dvh-72px)+4rem)]"
              : "material fixed top-[76px] right-[calc(var(--gutter)+var(--removed-body-scroll-bar-size,0px))] z-40 flex h-[min(400px,calc(100dvh-152px))] max-h-[calc(100dvh-152px)] w-[clamp(340px,calc(100vw-600px-3*var(--gutter)-16px),400px)] flex-col transition-[opacity,translate] duration-220 ease-out outline-none data-media:h-[min(640px,calc(100dvh-152px))] data-media:w-[clamp(340px,calc(100vw-600px-3*var(--gutter)-16px),480px)] data-[phase=closed]:pointer-events-none data-[phase=closed]:translate-x-3 data-[phase=closed]:opacity-0 data-[phase=closed]:duration-160 starting:translate-x-3 starting:opacity-0 pointer-coarse:h-[min(356px,calc(100dvh-152px))] pointer-coarse:data-media:h-[min(600px,calc(100dvh-152px))]"
          }
        >
          {sheet && (
            <div
              aria-hidden="true"
              data-sheet-grip
              className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-white/20"
            />
          )}
          <PeekHeader
            project={project}
            previous={previous}
            next={next}
            position={position}
            total={sequence.length}
            onStep={step}
          />
          <div
            ref={body}
            data-scrollable={scrollable}
            className="min-h-0 flex-1 touch-none overflow-y-auto overscroll-contain px-5 pb-5 data-[scrollable=true]:touch-pan-y"
          >
            <PeekDetails key={project.title} ref={measure} project={project} />
          </div>
          <PeekFooter position={position} total={sequence.length} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
