"use client";

import { type Ref, useRef, useState } from "react";
import type { Project } from "~/content/projects";
import { closeProject, openProject, usePeek } from "~/lib/peek";
import { notableContributions } from "~/lib/projects";
import { cn } from "~/lib/utils";
import { Catalog } from "./catalog";
import { useStageLayout } from "./layout";
import { Preview } from "./preview";

const more = Catalog.moreContributions(Catalog.contributions);

const QUIET =
  "inline-flex h-7 items-center rounded-md text-[13px] transition-[background-color,color,scale] duration-150 ease-out active:scale-[.97] pointer-coarse:h-10";

/**
 * A contribution that opens the project view, like a row of Selected work: on
 * wide screens with a mouse, hovering previews it on the stage and clicking
 * pins it; elsewhere it opens the bottom sheet. The view links to the pull
 * request.
 */
function Chip({
  project,
  revealed = false,
  chipRef,
}: {
  project: Project;
  /** Fades in, for chips revealed by "and N more". */
  revealed?: boolean;
  chipRef?: Ref<HTMLButtonElement>;
}) {
  const peek = usePeek();
  const stage = useStageLayout();
  const open = peek === project.title;
  const slash = project.title.indexOf("/");
  return (
    <li
      className={cn(
        "max-w-full",
        revealed &&
          "transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0",
      )}
    >
      <button
        ref={chipRef}
        type="button"
        data-project={project.title}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (open) closeProject();
          else openProject(project.title);
        }}
        onFocus={(event) => {
          if (stage && event.currentTarget.matches(":focus-visible"))
            Preview.enter(project.title, null);
        }}
        onBlur={() => {
          if (stage) Preview.leave(null);
        }}
        onPointerEnter={(event) => {
          if (stage && event.pointerType !== "touch")
            Preview.enter(project.title, {
              x: event.clientX,
              y: event.clientY,
            });
        }}
        onPointerLeave={(event) => {
          if (stage && event.pointerType !== "touch")
            Preview.leave({ x: event.clientX, y: event.clientY });
        }}
        className={`${QUIET} text-fg-2 pointer-fine:hover:text-fg aria-expanded:text-fg max-w-full border border-white/10 bg-white/[.06] px-2 aria-expanded:border-white/20 aria-expanded:bg-white/[.12] pointer-coarse:px-3 pointer-fine:hover:bg-white/10`}
      >
        <span className="min-w-0 truncate">
          <span className="text-fg-3">{project.title.slice(0, slash + 1)}</span>
          {project.title.slice(slash + 1)}
        </span>
      </button>
    </li>
  );
}

/** Upstream contributions: the notable ones as chips, the rest one click away. */
export function OpenSource() {
  const [expanded, setExpanded] = useState(false);
  const firstMore = useRef<HTMLButtonElement>(null);
  return (
    <section aria-labelledby="open-source" className="material p-1.5">
      <div className="flex min-h-10 items-center py-2 pl-3">
        <h2 id="open-source" className="text-fg-2 text-[13px] font-medium">
          Open source{" "}
          <span className="text-fg-3 font-normal">
            (albeit <em className="[font-synthesis:style]">minor</em>{" "}
            contributions)
          </span>
        </h2>
      </div>
      <ul className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
        {notableContributions.map((project) => (
          <Chip key={project.title} project={project} />
        ))}
        {expanded ? (
          more.map((project, index) => (
            <Chip
              key={project.title}
              project={project}
              revealed
              chipRef={index === 0 ? firstMore : undefined}
            />
          ))
        ) : more.length > 0 ? (
          <li className="noscript:hidden">
            <button
              type="button"
              aria-expanded={false}
              onClick={() => {
                setExpanded(true);
                requestAnimationFrame(() => firstMore.current?.focus());
              }}
              className={`${QUIET} text-fg-3 pointer-fine:hover:text-fg-2 px-1.5 pointer-fine:hover:bg-white/[.05]`}
            >
              and {more.length} more
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
