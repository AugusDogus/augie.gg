import type { Project } from "~/content/projects";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** `2025-06-19` as `June 2025`; null for anything that is not `YYYY-MM-DD`. */
export function monthYear(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  const month = MONTHS[Number(match?.[2]) - 1];
  if (!match || month === undefined) return null;
  return `${month} ${match[1]}`;
}

/** Where a project's primary action leads. */
export type Destination =
  | { kind: "website"; href: string }
  | { kind: "repository"; href: string }
  | { kind: "pull-request"; href: string }
  | { kind: "private" }
  | { kind: "none" };

const GITHUB_PULL = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/;

export const Destination = {
  of(project: Pick<Project, "href" | "private">): Destination {
    const { href } = project;
    if (href === undefined)
      return project.private ? { kind: "private" } : { kind: "none" };
    if (GITHUB_PULL.test(href)) return { kind: "pull-request", href };
    if (href.startsWith("https://github.com/"))
      return { kind: "repository", href };
    return { kind: "website", href };
  },
} as const;
