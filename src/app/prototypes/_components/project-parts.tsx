import { LockSimpleIcon } from "@phosphor-icons/react/ssr";
import { Fragment, type ReactNode } from "react";
import type { Label, Project } from "~/content/projects";
import { displayHost, yearOf } from "~/lib/projects";
import { cn } from "~/lib/utils";

export const focusRing =
  "rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const titleLink = cn(
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

function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
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
export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE_LINK)) {
    const [whole, label, href] = match;
    if (label === undefined || href === undefined) continue;
    parts.push(text.slice(cursor, match.index));
    parts.push(
      <ExternalLink key={match.index} href={href} className={inlineLink}>
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
export function ProjectTitle({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  return (
    <span className={cn("text-foreground", className)}>
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

/**
 * The site's ledger row: name and labels, year on the right, blurb below,
 * and the evidence line for featured work.
 */
export function LedgerEntry({
  project,
  size = "md",
  omitLabels,
  showHost = false,
  showYear = true,
  headingLevel: Heading = "h3",
  className,
}: {
  project: Project;
  size?: "sm" | "md";
  omitLabels?: readonly Label[];
  showHost?: boolean;
  showYear?: boolean;
  headingLevel?: "h3" | "h4";
  className?: string;
}) {
  const host = showHost ? displayHost(project.href) : undefined;
  const meta = [host, project.highlight].filter(Boolean).join(" · ");
  return (
    <li className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Heading
          className={cn(
            "leading-snug font-normal",
            size === "md" ? "text-base" : "text-sm md:text-base",
          )}
        >
          <ProjectTitle project={project} />
          <Labels
            labels={project.labels}
            omit={omitLabels}
            className="ml-2 align-[1px]"
          />
        </Heading>
        {showYear && (
          <span className="text-muted-foreground/80 shrink-0 text-xs tabular-nums">
            {yearOf(project)}
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-sm leading-normal text-pretty">
        <RichText text={project.blurb} />
      </p>
      {meta && (
        <p className="text-muted-foreground/80 text-xs leading-normal">
          {meta}
        </p>
      )}
    </li>
  );
}

/** Name, labels, and blurb on one run-in line, for long tails of work. */
export function CompactEntry({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  return (
    <li className={cn("text-muted-foreground text-sm leading-6", className)}>
      <ProjectTitle project={project} />
      <Labels labels={project.labels} className="mr-1 ml-2 align-[1px]" />{" "}
      <span aria-hidden="true" className="text-muted-foreground/50">
        –
      </span>{" "}
      <RichText text={project.blurb} />
    </li>
  );
}

export function Labels({
  labels,
  omit = [],
  className,
}: {
  labels: readonly Label[] | undefined;
  omit?: readonly Label[];
  className?: string;
}) {
  const visible = labels?.filter((label) => !omit.includes(label)) ?? [];
  if (visible.length === 0) return null;
  return (
    <span className={cn("inline-flex gap-2", className)}>
      {visible.map((label) => (
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
