import { type Project, projects } from "~/content/projects";
import { archivedProjects, featuredProjects } from "~/lib/projects";

type Titled = { title: string };

export const Catalog = {
  /** Every project: the featured rows plus the archive. */
  count: featuredProjects.length + archivedProjects.length,
  /** Merged upstream contributions, newest first. */
  contributions: projects.filter((project) => project.labels?.includes("oss")),
  find(title: string): Project | undefined {
    return projects.find((project) => project.title === title);
  },
  /** The list the peek steps through: featured among featured, the rest through the archive. */
  sequenceFor(title: string): readonly Project[] {
    return featuredProjects.some((project) => project.title === title)
      ? featuredProjects
      : archivedProjects;
  },
  neighbor<T extends Titled>(
    list: readonly T[],
    title: string,
    delta: -1 | 1,
  ): T | null {
    const index = list.findIndex((item) => item.title === title);
    if (index === -1) return null;
    return list[index + delta] ?? null;
  },
  position(list: readonly Titled[], title: string): number | null {
    const index = list.findIndex((item) => item.title === title);
    return index === -1 ? null : index + 1;
  },
  /** Open source contributions not already named as notable. */
  moreContributions(list: readonly Project[]): Project[] {
    return list.filter(
      (project) =>
        project.labels?.includes("oss") && project.notable === undefined,
    );
  },
} as const;
