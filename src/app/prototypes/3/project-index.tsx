"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { Category, Project } from "~/content/projects";
import { categoryName, groupByYear } from "~/lib/projects";
import { cn } from "~/lib/utils";
import {
  Labels,
  ProjectTitle,
  RichText,
  focusRing,
} from "../_components/project-parts";

type Filter = "all" | "featured" | Category;

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "all", label: "all" },
  { id: "featured", label: "selected" },
  { id: "product", label: "products" },
  { id: "tool", label: "tools" },
  { id: "game", label: "games & mods" },
  { id: "oss", label: "open source" },
];

function matchesFilter(project: Project, filter: Filter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "featured":
      return project.featured === true;
    case "product":
    case "tool":
    case "game":
    case "oss":
      return project.category === filter;
    default: {
      const unreachable: never = filter;
      return unreachable;
    }
  }
}

function matchesQuery(project: Project, query: string): boolean {
  if (query === "") return true;
  const haystack = [
    project.title,
    project.blurb,
    categoryName(project.category),
    ...(project.labels ?? []),
    project.private ? "private" : "",
    project.fork ? "fork" : "",
    project.date.slice(0, 4),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function ProjectIndex({ projects }: { projects: readonly Project[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.key !== "/" ||
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const byFilter = projects.filter((p) => matchesQuery(p, deferredQuery));
  const visible = byFilter.filter((p) => matchesFilter(p, filter));
  const years = groupByYear(visible);

  return (
    <section aria-labelledby="index-heading" className="space-y-6 pt-2">
      <h2 id="index-heading" className="sr-only">
        Projects
      </h2>

      <div className="space-y-4">
        <label className="border-border focus-within:border-foreground/40 flex items-center gap-2 border-b pb-2 transition-colors">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="text-muted-foreground size-3.5 shrink-0"
          />
          <span className="sr-only">Search projects</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`search ${projects.length} projects`}
            className="placeholder:text-muted-foreground/70 text-foreground min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className={`text-muted-foreground hover:text-foreground text-xs transition-colors ${focusRing}`}
            >
              clear
            </button>
          ) : (
            <kbd className="text-muted-foreground/70 border-border hidden rounded-[3px] border px-1.5 font-sans text-[10px] leading-4 md:inline">
              /
            </kbd>
          )}
        </label>

        <div
          role="group"
          aria-label="Filter by kind"
          className="-mx-6 flex gap-1 overflow-x-auto px-6 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        >
          {FILTERS.map(({ id, label }) => {
            const count = byFilter.filter((p) => matchesFilter(p, id)).length;
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(id)}
                className={cn(
                  focusRing,
                  "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs whitespace-nowrap transition-colors first:-ml-2.5",
                  active
                    ? "bg-foreground/[0.07] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span
                  className={cn(
                    "tabular-nums",
                    active
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "project" : "projects"} shown
      </p>

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Nothing matches{deferredQuery ? ` “${deferredQuery}”` : ""}.{" "}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className={`text-foreground decoration-foreground/30 underline underline-offset-4 ${focusRing}`}
          >
            Reset
          </button>
        </p>
      ) : (
        <div className="space-y-7">
          {years.map(({ year, projects: rows }) => (
            <div
              key={year}
              className="grid gap-x-6 gap-y-1 md:grid-cols-[4ch_1fr]"
            >
              <h3 className="text-muted-foreground/80 text-xs leading-7 font-normal tabular-nums md:sticky md:top-6 md:self-start">
                {year}
              </h3>
              <ul className="-mx-3 md:mx-0">
                {rows.map((project) => (
                  <li
                    key={project.title}
                    className="hover:bg-foreground/[0.03] grid grid-cols-[1fr_auto] gap-x-4 rounded-md px-3 py-1.5 transition-colors md:-mx-3"
                  >
                    <div className="min-w-0 text-sm leading-6">
                      <ProjectTitle project={project} />
                      {project.featured && (
                        <span
                          title="Selected work"
                          className="bg-foreground/70 ml-2 inline-block size-1 -translate-y-[3px] rounded-full"
                        >
                          <span className="sr-only">Selected work</span>
                        </span>
                      )}
                      <Labels
                        labels={project.labels}
                        omit={project.category === "oss" ? ["oss"] : []}
                        className="ml-2 align-[1px]"
                      />
                    </div>
                    <span className="text-muted-foreground/80 text-xs leading-6">
                      {categoryName(project.category)}
                    </span>
                    <p className="text-muted-foreground col-span-2 text-xs leading-normal text-pretty">
                      <RichText text={project.blurb} />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
