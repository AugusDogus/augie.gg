import { type Project, projects } from "~/content/projects";

export function yearOf(project: Project): number {
  return Number(project.date.slice(0, 4));
}

/** Newest first; `Array.prototype.sort` is stable, so ties keep file order. */
const newestFirst: readonly Project[] = [...projects].sort((a, b) =>
  b.date.localeCompare(a.date),
);

export const featuredProjects: readonly Project[] = projects
  .filter((project) => project.featured !== undefined)
  .sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0));

export const notableContributions: readonly Project[] = newestFirst.filter(
  (project) => project.notable,
);

export const archivedProjects: readonly Project[] = newestFirst.filter(
  (project) => project.featured === undefined,
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
