import { LockSimpleIcon } from "@phosphor-icons/react/ssr";
import { Fragment, type ReactNode } from "react";
import type { Label, Project } from "~/content/projects";
import { yearOf } from "~/lib/projects";
import { cn } from "~/lib/utils";

const focusRing =
  "rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const titleLink = cn(
  "text-foreground decoration-foreground/30 underline-offset-[5px] transition-colors hover:underline",
  focusRing,
);

const inlineLink = cn(
  "text-foreground/90 underline decoration-foreground/20 underline-offset-4 transition-colors hover:decoration-foreground/70",
  focusRing,
);

/** Quiet lowercase heading used for section and year labels. */
export const eyebrow =
  "text-muted-foreground text-xs font-normal tracking-[0.1em]";

export function ExternalLink({
  href,
  className = inlineLink,
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
      <ExternalLink key={match.index} href={href}>
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

/**
 * Project name with its markers: lock for private repos, ⑂ for forks.
 * Private projects have no public link, so they render as plain text.
 */
function ProjectTitle({ project }: { project: Project }) {
  return (
    <span className="text-foreground">
      {project.private && (
        <LockSimpleIcon
          alt="Private repository"
          className="mr-1.5 inline-block size-[0.9em] -translate-y-px"
        />
      )}
      {project.fork && (
        <>
          <span aria-hidden="true" className="text-muted-foreground mr-1">
            ⑂
          </span>
          <span className="sr-only">Fork: </span>
        </>
      )}
      {project.href ? (
        <ExternalLink href={project.href} className={titleLink}>
          {project.title}
        </ExternalLink>
      ) : (
        project.title
      )}
    </span>
  );
}

function Labels({
  labels,
  className,
}: {
  labels: readonly Label[] | undefined;
  className?: string;
}) {
  if (!labels?.length) return null;
  return (
    <span className={cn("inline-flex gap-2 align-[1px]", className)}>
      {labels.map((label) => (
        <span
          key={label}
          className="text-muted-foreground/80 text-[10px] leading-none tracking-[0.06em] uppercase"
        >
          {label}
        </span>
      ))}
    </span>
  );
}

/** Name and labels with the year on the right, then blurb and evidence. */
export function FeaturedEntry({ project }: { project: Project }) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base leading-snug font-normal">
          <ProjectTitle project={project} />
          <Labels labels={project.labels} className="ml-2" />
        </h3>
        <span className="text-muted-foreground/80 shrink-0 text-xs tabular-nums">
          {yearOf(project)}
        </span>
      </div>
      <p className="text-muted-foreground text-sm leading-normal text-pretty">
        <RichText text={project.blurb} />
      </p>
      {project.highlight && (
        <p className="text-muted-foreground/80 text-xs leading-normal text-pretty">
          {project.highlight}
        </p>
      )}
    </li>
  );
}

/** Name, labels, and blurb on one run-in line, for the archive. */
export function ArchiveEntry({ project }: { project: Project }) {
  return (
    <li className="text-muted-foreground text-sm leading-6">
      <ProjectTitle project={project} />
      <Labels labels={project.labels} className="mr-1 ml-2" />{" "}
      <span aria-hidden="true" className="text-muted-foreground/50">
        –
      </span>{" "}
      <RichText text={project.blurb} />
    </li>
  );
}
