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

export const notableContributions: readonly Project[] = projects
  .filter((project) => project.notable !== undefined)
  .sort((a, b) => (a.notable ?? 0) - (b.notable ?? 0));

function isContribution(project: Project): boolean {
  return project.labels?.includes("oss") ?? false;
}

/** Augie's own projects outside Selected work; contributions live in the open source section. */
export const archivedProjects: readonly Project[] = newestFirst.filter(
  (project) => project.featured === undefined && !isContribution(project),
);

/** Upstream contributions in the open source section's order: the notable ones, then the rest. */
export const contributionProjects: readonly Project[] = [
  ...notableContributions,
  ...projects.filter(
    (project) => isContribution(project) && project.notable === undefined,
  ),
];

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
