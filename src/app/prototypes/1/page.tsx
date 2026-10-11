import type { Metadata } from "next";
import type { ReactNode } from "react";
import { allProjects, groupByYear, isUpstream } from "~/lib/projects";
import { HomeIntro } from "../_components/home-intro";
import {
  CompactEntry,
  LedgerEntry,
  eyebrow,
} from "../_components/project-parts";

export const metadata: Metadata = { title: "Prototype 1 · Selected" };

const selected = allProjects.filter((p) => p.featured && !isUpstream(p));
const upstream = allProjects.filter(isUpstream);
const archive = allProjects.filter((p) => !p.featured && !isUpstream(p));
const archiveYears = groupByYear(archive);

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

export default function SelectedPrototype() {
  return (
    <div className="space-y-6">
      <HomeIntro />

      <div className="space-y-16 pt-2">
        <section aria-labelledby="selected">
          <SectionHeading id="selected">selected work</SectionHeading>
          <ul className="space-y-7">
            {selected.map((project) => (
              <LedgerEntry key={project.title} project={project} showHost />
            ))}
          </ul>
        </section>

        <section aria-labelledby="upstream">
          <SectionHeading
            id="upstream"
            aside={`${upstream.length} contributions`}
          >
            open source
          </SectionHeading>
          <ul className="space-y-5">
            {upstream.map((project) => (
              <LedgerEntry
                key={project.title}
                project={project}
                size="sm"
                omitLabels={["oss"]}
              />
            ))}
          </ul>
        </section>

        <section aria-labelledby="archive">
          <SectionHeading
            id="archive"
            aside={`${archive.length} projects since ${archiveYears.at(-1)?.year}`}
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
                    <CompactEntry key={project.title} project={project} />
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
