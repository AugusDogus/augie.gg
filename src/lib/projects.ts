import { type Category, type Project, projects } from "~/content/projects";

/** Projects started before this year are grouped as "Earlier work". */
export const EARLIER_BEFORE_YEAR = 2024;

export type Section = Category | "earlier";

export const SECTIONS: readonly {
  id: Section;
  title: string;
  description: string;
}[] = [
  {
    id: "product",
    title: "Products",
    description: "Live sites and apps anyone can use.",
  },
  {
    id: "tool",
    title: "Tools & experiments",
    description: "Utilities, libraries, desktop and hardware hacks.",
  },
  {
    id: "game",
    title: "Games & mods",
    description: "Games, mods, and the tooling around them.",
  },
  {
    id: "oss",
    title: "Open source",
    description: "Merged upstream work, and forks that extend other projects.",
  },
  {
    id: "earlier",
    title: "Earlier work",
    description: "Discord bots, Unity games, Plex tooling, first experiments.",
  },
];

export function categoryName(category: Category): string {
  switch (category) {
    case "product":
      return "product";
    case "tool":
      return "tool";
    case "game":
      return "game";
    case "oss":
      return "open source";
    default: {
      const unreachable: never = category;
      return unreachable;
    }
  }
}

export function yearOf(project: Project): number {
  return Number(project.date.slice(0, 4));
}

/** Contributions to someone else's repo, as opposed to forks or own repos. */
export function isUpstream(project: Project): boolean {
  return (
    project.labels?.some((label) => label === "oss" || label === "pending") ??
    false
  );
}

/**
 * Upstream contributions always read as open source credentials; everything
 * else from before the cutoff is filed as earlier work regardless of kind.
 */
export function sectionOf(project: Project): Section {
  if (isUpstream(project)) return "oss";
  if (yearOf(project) < EARLIER_BEFORE_YEAR) return "earlier";
  return project.category;
}

/** Newest first; `Array.prototype.sort` is stable, so ties keep file order. */
export const allProjects: readonly Project[] = [...projects].sort((a, b) =>
  b.date.localeCompare(a.date),
);

export function groupByYear(
  list: readonly Project[],
): { year: number; projects: Project[] }[] {
  const groups: { year: number; projects: Project[] }[] = [];
  for (const project of list) {
    const year = yearOf(project);
    const last = groups.at(-1);
    if (last?.year === year) last.projects.push(project);
    else groups.push({ year, projects: [project] });
  }
  return groups;
}

/** Short host for non-GitHub links, e.g. `thunderstore.io`. */
export function displayHost(href: string | undefined): string | undefined {
  if (href === undefined) return undefined;
  const host = new URL(href).hostname.replace(/^www\./, "");
  return host === "github.com" ? undefined : host;
}
