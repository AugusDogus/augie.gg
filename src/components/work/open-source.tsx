"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { type Ref, useRef, useState } from "react";
import type { Project } from "~/content/projects";
import { notableContributions } from "~/lib/projects";
import { cn } from "~/lib/utils";
import { Catalog } from "./catalog";

const more = Catalog.moreContributions(Catalog.contributions);

const QUIET =
  "inline-flex h-7 items-center rounded-md text-[13px] transition-[background-color,color,scale] duration-150 ease-out active:scale-[.97] pointer-coarse:h-10";

function Chip({
  project,
  revealed = false,
  chipRef,
}: {
  project: Project;
  /** Fades in, for chips revealed by "and N more". */
  revealed?: boolean;
  chipRef?: Ref<HTMLAnchorElement>;
}) {
  if (project.href === undefined) return null;
  const slash = project.title.indexOf("/");
  return (
    <li
      className={cn(
        "max-w-full",
        revealed &&
          "transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0",
      )}
    >
      <a
        ref={chipRef}
        href={project.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${QUIET} text-fg-2 pointer-fine:hover:text-fg max-w-full gap-1.5 border border-white/10 bg-white/[.06] pr-1.5 pl-2 pointer-coarse:px-3 pointer-fine:hover:bg-white/10`}
      >
        <span className="min-w-0 truncate">
          <span className="text-fg-3">{project.title.slice(0, slash + 1)}</span>
          {project.title.slice(slash + 1)}
        </span>
        <ArrowUpRightIcon aria-hidden="true" className="text-fg-3 size-3" />
      </a>
    </li>
  );
}

/** Upstream contributions: the notable ones as chips, the rest one click away. */
export function OpenSource() {
  const [expanded, setExpanded] = useState(false);
  const firstMore = useRef<HTMLAnchorElement>(null);
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
