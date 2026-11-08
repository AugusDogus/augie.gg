import { statusOf, STATUS_LABEL } from "~/components/status-icon";
import type { Project } from "~/content/projects";
import {
  archivedProjects,
  contributionProjects,
  featuredProjects,
} from "~/lib/projects";
import { plainText, rank, type Searchable } from "./match";

export type ActionId = "copy-email" | "resume" | "github" | "animation";
export type ProjectGroup = "work" | "oss" | "archive";
export type GroupId = "actions" | ProjectGroup;

export interface ActionEntry {
  kind: "action";
  key: ActionId;
  search: Searchable;
}

export interface ProjectEntry {
  kind: "project";
  key: string;
  group: ProjectGroup;
  project: Project;
  /** The blurb as plain text. */
  blurb: string;
  search: Searchable;
}

export type Entry = ActionEntry | ProjectEntry;

export interface Group {
  id: GroupId;
  heading: string;
  entries: Entry[];
}

function projectEntries(
  group: ProjectGroup,
  list: readonly Project[],
): ProjectEntry[] {
  return list.map((project, index) => {
    const blurb = plainText(project.blurb);
    const status = statusOf(project.labels);
    const keywords = [
      ...(status ? [STATUS_LABEL[status]] : []),
      ...(project.contributionName ? [project.contributionName] : []),
    ];
    return {
      kind: "project",
      key: `${group}-${index}`,
      group,
      project,
      blurb,
      search: { title: project.title, keywords, blurb },
    };
  });
}

const work = projectEntries("work", featuredProjects);
const oss = projectEntries("oss", contributionProjects);
const archive = projectEntries("archive", archivedProjects);

/** Visible groups for `query`, each ranked on its own; Everything else waits for a query. */
export function searchGroups(query: string, actions: Entry[]): Group[] {
  const groups: Group[] = [
    { id: "actions", heading: "Actions", entries: actions },
    { id: "work", heading: "Selected work", entries: work },
    { id: "oss", heading: "Open source", entries: oss },
  ];
  if (query.trim() !== "")
    groups.push({
      id: "archive",
      heading: "Everything else",
      entries: archive,
    });
  return groups
    .map((group) => ({
      ...group,
      entries: rank(query, group.entries, (entry) => entry.search),
    }))
    .filter((group) => group.entries.length > 0);
}
