"use client";

import { LockSimpleIcon } from "@phosphor-icons/react";
import { useMemo, useState, type ReactNode } from "react";
import {
  type Project,
  type ProjectCategory,
  type ProjectLabel,
} from "~/content/projects";
import { cn } from "~/lib/utils";

type CategoryFilter = "all" | ProjectCategory;

const categoryFilters = [
  { id: "all", label: "all" },
  { id: "products", label: "products" },
  { id: "tools", label: "tools" },
  { id: "oss", label: "oss" },
  { id: "games", label: "games" },
  { id: "archive", label: "archive" },
] satisfies { id: CategoryFilter; label: string }[];

const categoryLabels = {
  products: "product",
  tools: "tool",
  oss: "oss",
  games: "game/mod",
  archive: "archive",
} satisfies Record<ProjectCategory, string>;

const labelNames = {
  wip: "wip",
  active: "active",
  archived: "archived",
  oss: "oss",
  pending: "pending",
} satisfies Record<ProjectLabel, string>;

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ProjectTitle({ project }: { project: Project }) {
  const title = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {project.fork ? (
        <span className="text-muted-foreground/60" aria-label="Fork">
          ⑂
        </span>
      ) : null}
      {project.locked ? (
        <LockSimpleIcon
          aria-label="Private repository"
          className="size-3.5 shrink-0 -translate-y-px"
        />
      ) : null}
      <span>{project.title}</span>
    </span>
  );

  if (!project.href) {
    return <span className="text-foreground">{title}</span>;
  }

  return (
    <a
      href={project.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground hover:text-primary transition-colors"
    >
      {title}
    </a>
  );
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5 text-[10px] tracking-[0.08em] uppercase">
      {children}
    </span>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <li className="border-border grid gap-2 border-t py-3 first:border-t-0 md:grid-cols-[4rem_minmax(0,1fr)_7rem_8rem] md:items-start md:gap-3">
      <time
        dateTime={project.date}
        title={formatDate(project.date)}
        className="text-muted-foreground/60 text-xs md:pt-0.5"
      >
        {project.year}
      </time>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="font-normal">
          <ProjectTitle project={project} />
        </h3>
        <p className="text-muted-foreground text-sm leading-normal">
          {project.description}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 md:pt-0.5">
        <MetaPill>{categoryLabels[project.category]}</MetaPill>
      </div>
      <div className="flex flex-wrap gap-1.5 md:justify-end md:pt-0.5">
        {project.featured ? <MetaPill>featured</MetaPill> : null}
        {project.labels.map((label) => (
          <MetaPill key={label}>{labelNames[label]}</MetaPill>
        ))}
      </div>
    </li>
  );
}

export function ProjectFilterIndex({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const categoryMatches =
          category === "all" || project.category === category;
        const featuredMatches = !featuredOnly || project.featured;
        return categoryMatches && featuredMatches;
      }),
    [category, featuredOnly, projects],
  );

  return (
    <section aria-labelledby="project-index" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs tracking-[0.12em] uppercase">
          Project index
        </p>
        <h2 id="project-index" className="text-base font-normal">
          Scan by year, category, status, and signal.
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Every timeline entry is still present, but the default view is a
          compact index. Use filters to narrow the list without leaving the
          page.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="Filter projects by category"
          className="flex flex-wrap gap-2"
        >
          {categoryFilters.map((filter) => (
            <FilterButton
              key={filter.id}
              active={category === filter.id}
              onClick={() => setCategory(filter.id)}
            >
              {filter.label}
            </FilterButton>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterButton
            active={featuredOnly}
            onClick={() => setFeaturedOnly((value) => !value)}
          >
            featured only
          </FilterButton>
          <p className="text-muted-foreground/60 text-xs">
            Showing {filteredProjects.length} of {projects.length}
          </p>
        </div>
      </div>

      <div className="border-border rounded-lg border p-3">
        <div className="text-muted-foreground/60 border-border hidden grid-cols-[4rem_minmax(0,1fr)_7rem_8rem] gap-3 border-b pb-2 text-[10px] tracking-[0.12em] uppercase md:grid">
          <span>year</span>
          <span>project</span>
          <span>category</span>
          <span className="text-right">status</span>
        </div>
        <ul>
          {filteredProjects.map((project) => (
            <ProjectRow
              key={`${project.date}-${project.title}`}
              project={project}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
