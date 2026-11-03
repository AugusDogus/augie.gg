import { LockSimpleIcon } from "@phosphor-icons/react/ssr";
import { Fragment, type ReactNode } from "react";
import type { Label, Project } from "~/content/projects";
import { yearOf } from "~/lib/projects";

const LINK =
  "underline decoration-[var(--link-rest)] decoration-1 underline-offset-4 transition-[text-decoration-color] duration-[120ms] hover:decoration-current";

export function ExternalLink({
  href,
  className = LINK,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

const INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Blurb text with `[text](url)` links rendered inline. */
function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE_LINK)) {
    const [whole, label, href] = match;
    if (label === undefined || href === undefined) continue;
    parts.push(text.slice(cursor, match.index));
    parts.push(
      <ExternalLink
        key={match.index}
        href={href}
        className={`${LINK} text-ink`}
      >
        {label}
      </ExternalLink>,
    );
    cursor = match.index + whole.length;
  }
  parts.push(text.slice(cursor));
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}

function statusWord(label: Label): string | null {
  switch (label) {
    case "wip":
      return "In progress";
    case "active":
      return "Active";
    case "archived":
      return "Archived";
    case "pending":
      return "In review";
    case "oss":
      return null;
    default: {
      const unreachable: never = label;
      return unreachable;
    }
  }
}

/** The first label with a status word, if any. */
function status(project: Project) {
  for (const label of project.labels ?? []) {
    const word = statusWord(label);
    if (word) return word;
  }
  return null;
}

/** Mono project name: linked when public, locked when the repository is private. */
function ProjectTitle({ project }: { project: Project }) {
  const name = (
    <span className="font-mono text-[15px]/[1.35] font-medium">
      {project.title}
    </span>
  );
  if (project.href)
    return (
      <ExternalLink
        href={project.href}
        className={`${LINK} inline-block min-h-6`}
      >
        {name}
      </ExternalLink>
    );
  return (
    <span className="inline-flex min-h-6 items-baseline gap-1.5">
      {project.private && (
        <>
          <LockSimpleIcon
            className="size-3.5 translate-y-0.5 self-center"
            aria-hidden="true"
          />
          <span className="sr-only">Private repository: </span>
        </>
      )}
      {name}
    </span>
  );
}

export function FeaturedEntry({ project }: { project: Project }) {
  const word = status(project);
  return (
    <li className="border-border border-b pt-4 pb-[18px]">
      <div className="text-muted-foreground flex items-baseline gap-2.5 text-[14px]/[1.4] tabular-nums">
        <span className="text-ink">
          <ProjectTitle project={project} />
        </span>
        {word && <span>{word}</span>}
        <span className="ml-auto">{yearOf(project)}</span>
      </div>
      <p className="mt-1.5 text-base/normal text-pretty">{project.blurb}</p>
      {project.highlight && (
        <p className="text-muted-foreground mt-1 text-[15px]/normal text-pretty">
          {project.highlight}
        </p>
      )}
    </li>
  );
}

export function ArchiveEntry({ project }: { project: Project }) {
  return (
    <li className="text-muted-foreground pb-3 text-[15px]/[1.55] wrap-anywhere">
      <span className="text-ink">
        <ProjectTitle project={project} />
      </span>{" "}
      <RichText text={project.blurb} />
    </li>
  );
}

const SMALL = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

/** "and six others": spelled out below ten, digits above; nothing when there are none. */
export function othersClause(count: number) {
  if (count <= 0) return "";
  if (count === 1) return "and one other";
  return `and ${SMALL[count - 1] ?? count.toLocaleString("en-US")} others`;
}
