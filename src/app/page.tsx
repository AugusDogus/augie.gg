import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ContributionGraph } from "~/components/contribution-graph";
import {
  ArchiveEntry,
  ExternalLink,
  FeaturedEntry,
  eyebrow,
} from "~/components/projects";
import { ThemeToggle } from "~/components/theme-toggle";
import {
  archivedProjects,
  featuredProjects,
  groupByYear,
  notableContributions,
} from "~/lib/projects";

const navLink =
  "text-muted-foreground hover:text-foreground text-sm transition-colors";

const archiveYears = groupByYear(archivedProjects);

function SectionHeading({
  id,
  children,
  aside,
}: {
  id: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4">
      <h2 id={id} className={eyebrow}>
        {children}
      </h2>
      {aside && (
        <span className="text-muted-foreground/80 text-xs tabular-nums">
          {aside}
        </span>
      )}
    </div>
  );
}

/** "a, b, c, and d" with each contribution linked. */
function ContributionList() {
  const last = notableContributions.length - 1;
  return notableContributions.map((project, i) => (
    <Fragment key={project.title}>
      {i > 0 && (i === last ? (last > 1 ? ", and " : " and ") : ", ")}
      {project.href ? (
        <ExternalLink href={project.href}>{project.title}</ExternalLink>
      ) : (
        project.title
      )}
    </Fragment>
  ));
}

export default function Home() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <nav className="flex gap-4">
          <Link href="/resume" className={navLink}>
            resume
          </Link>
          <a
            href="https://github.com/AugusDogus"
            target="_blank"
            rel="noopener noreferrer"
            className={navLink}
          >
            github
          </a>
        </nav>
        <ThemeToggle />
      </header>

      <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
        Augie Luebbers
      </h1>

      <ContributionGraph />

      <div className="space-y-16 pt-2">
        <section aria-labelledby="selected">
          <SectionHeading id="selected">selected work</SectionHeading>
          <ul className="space-y-7">
            {featuredProjects.map((project) => (
              <FeaturedEntry key={project.title} project={project} />
            ))}
          </ul>
          {notableContributions.length > 0 && (
            <p className="text-muted-foreground mt-10 text-sm leading-normal text-pretty">
              <span className={`${eyebrow} mr-3`}>open source</span>
              Fixes and features upstream in <ContributionList />.
            </p>
          )}
        </section>

        <section aria-labelledby="archive">
          <SectionHeading
            id="archive"
            aside={`${archivedProjects.length} projects since ${archiveYears.at(-1)?.year}`}
          >
            everything else
          </SectionHeading>
          <div className="space-y-8">
            {archiveYears.map(({ year, projects }) => (
              <section
                key={year}
                aria-labelledby={`year-${year}`}
                className="grid gap-x-6 gap-y-2 md:grid-cols-[4ch_1fr]"
              >
                <h3
                  id={`year-${year}`}
                  className="text-muted-foreground/80 text-xs leading-6 font-normal tabular-nums md:sticky md:top-6 md:self-start"
                >
                  {year}
                </h3>
                <ul className="space-y-2.5">
                  {projects.map((project) => (
                    <ArchiveEntry key={project.title} project={project} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
