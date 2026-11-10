"use client";

import { Dialog } from "radix-ui";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePlaying } from "~/components/flight-background";
import { Catalog } from "~/components/work/catalog";
import { useStageLayout } from "~/components/work/layout";
import { PeekControls, PeekFooter } from "~/components/work/peek-content";
import { PeekFocus } from "~/components/work/peek-focus";
import { PeekKeys } from "~/components/work/peek-keys";
import { ProjectView } from "~/components/work/project-view";
import { Stage } from "~/components/work/stage";
import { useSheetDrag } from "~/components/work/use-sheet-drag";
import { SHEET_LEAD, Warm } from "~/components/work/warm";
import type { Project } from "~/content/projects";
import { closeProject, openProject, usePeek } from "~/lib/peek";

/** The sheet's exit; it stays mounted until the transition finishes. */
const EXIT_MS = 300;

/**
 * The open project, in the one project view: on the stage beside the list on
 * wide screens with a mouse, in a modal bottom sheet with drag-to-dismiss
 * everywhere else.
 */
export function ProjectPeek() {
  const stage = useStageLayout();
  return stage ? <Stage /> : <SheetPeek />;
}

function SheetPeek() {
  const title = usePeek();
  const project = title === null ? undefined : Catalog.find(title);
  const { reduced } = usePlaying();
  const [last, setLast] = useState<Project | null>(null);
  if (project !== undefined && project !== last) setLast(project);
  const open = project !== undefined;

  useEffect(() => {
    const timer =
      open || last === null
        ? undefined
        : setTimeout(() => setLast(null), reduced ? 0 : EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, last, reduced]);

  const shown = project ?? last;
  if (shown === null) return null;
  return <Sheet project={shown} open={open} />;
}

function Sheet({ project, open }: { project: Project; open: boolean }) {
  const content = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const [scrollable, setScrollable] = useState(false);
  const sequence = Catalog.sequenceFor(project.title);
  const previous = Catalog.neighbor(sequence, project.title, -1);
  const next = Catalog.neighbor(sequence, project.title, 1);
  const position = Catalog.position(sequence, project.title);
  const { body, backdrop, handlers } = useSheetDrag(closeProject);

  // Stepping is the likeliest next move: have both neighbours' captures on the way.
  useEffect(() => {
    Warm.project(previous);
    Warm.project(next);
  }, [previous, next]);

  function step(target: Project | null) {
    if (target === null) return;
    // The details are swapped out; keep focus in the sheet rather than losing it to the page.
    if (body.current?.contains(document.activeElement))
      content.current?.focus({ preventScroll: true });
    openProject(target.title);
    body.current?.scrollTo({ top: 0 });
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
    if (!open || !PeekKeys.claims(event, content.current)) return;
    const delta = PeekKeys.step(event);
    const target = delta === -1 ? previous : delta === 1 ? next : null;
    if (target === null) return;
    event.preventDefault();
    step(target);
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
      onOpenChange={(value) => {
        if (!value) closeProject();
      }}
    >
      <Dialog.Portal>
        {/* .material without its look: the flight engine ignores pointers over it, so the scrim never stirs the painting. */}
        <Dialog.Overlay
          ref={backdrop}
          data-phase={phase}
          className="material fixed inset-0 z-40 rounded-none border-0 bg-[#00000066] bg-none shadow-none backdrop-filter-none transition-opacity duration-300 ease-out data-[phase=closed]:opacity-0 starting:opacity-0"
        />
        <Dialog.Content
          ref={content}
          data-phase={phase}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            opener.current = document.activeElement;
            content.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            PeekFocus.restore(opener.current, project.title, "sheet");
          }}
          {...handlers}
          // Runs 4rem (Drag.UPWARD_LIMIT) past the viewport, so lifting it shows more glass, not a seam; its top clears the header.
          className="material ease-drawer fixed inset-x-0 -bottom-16 z-40 mx-auto flex max-h-[calc(100dvh-72px+4rem)] min-h-[calc(min(404px,100dvh-72px)+4rem)] max-w-[640px] [translate:0_var(--drag,0px)] touch-none flex-col rounded-t-2xl rounded-b-none border-b-0 pb-[calc(env(safe-area-inset-bottom)+4rem)] transition-[translate] duration-300 outline-none data-dragging:transition-none data-[phase=closed]:translate-y-full starting:translate-y-full pointer-coarse:min-h-[calc(min(400px,100dvh-72px)+4rem)]"
        >
          <div
            aria-hidden="true"
            data-sheet-grip
            className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-white/20"
          />
          <div
            data-sheet-grip
            className="flex h-12 shrink-0 items-center gap-2 pr-3 pl-4.5"
          >
            {/* Touch has no footer, so its place in the list sits here. */}
            {position !== null && (
              <span className="text-fg-3 hidden text-xs whitespace-nowrap tabular-nums pointer-coarse:inline">
                {position} of {sequence.length}
              </span>
            )}
            <div className="ml-auto">
              <PeekControls previous={previous} next={next} onStep={step} />
            </div>
          </div>
          <div
            ref={body}
            data-scrollable={scrollable}
            className="min-h-0 flex-1 touch-none overflow-y-auto overscroll-contain pb-2 data-[scrollable=true]:touch-pan-y"
          >
            <div
              key={project.title}
              ref={measure}
              className="transition-[opacity,filter] duration-200 ease-out starting:opacity-0 starting:blur-[2px]"
            >
              <ProjectView
                project={project}
                sizes={SHEET_LEAD}
                // Closing keeps it until the sheet is gone, so the slide out shows what was there.
                interactive
                mediaHeight="min(52dvh, 440px)"
                Title={Dialog.Title}
                Description={Dialog.Description}
              />
            </div>
          </div>
          <PeekFooter position={position} total={sequence.length} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
