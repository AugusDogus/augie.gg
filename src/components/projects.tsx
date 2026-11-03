import { Fragment, type ReactNode } from "react";
import type { Project } from "~/content/projects";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "~/components/ui/accordion";

export function ExternalLink({
  href,
  className = "underline underline-offset-4",
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

export function FeaturedEntry({ project }: { project: Project }) {
  return (
    <AccordionItem value={project.title}>
      <AccordionTrigger>
        <span className="project-name block text-base/[1.4] font-medium tracking-[-.025em] group-hover:text-[#1e5062]">
          {project.title}
        </span>
        <span className="project-summary text-muted-foreground mt-1.5 block text-[13px]/[1.55] font-normal">
          {project.blurb}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <p className="text-muted-foreground text-[13px]/[1.65]">
          {project.highlight}
        </p>
        {project.href ? (
          <ExternalLink
            className="project-destination mt-3.5 inline-flex text-xs font-medium underline-offset-4 hover:underline"
            href={project.href}
          >
            {project.href.startsWith("https://github.com/")
              ? "View repository"
              : "Visit website"}
          </ExternalLink>
        ) : (
          <p className="text-muted-foreground mt-3 text-[11px]/[1.65]">
            In progress · Private repository
          </p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export function ArchiveEntry({ project }: { project: Project }) {
  return (
    <li className="history-project pb-[18px]">
      <div className="text-[13px]/[1.6] font-medium wrap-anywhere">
        {project.href ? (
          <ExternalLink
            href={project.href}
            className="underline-offset-4 hover:underline"
          >
            {project.title}
          </ExternalLink>
        ) : (
          <span>{project.title}</span>
        )}
        {project.private && (
          <small className="text-muted-foreground block text-[10px]">
            Private repository
          </small>
        )}
      </div>
      <p className="text-muted-foreground mt-1 text-xs/[1.65] wrap-anywhere">
        <RichText text={project.blurb} />
      </p>
    </li>
  );
}
