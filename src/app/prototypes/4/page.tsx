import type { Metadata } from "next";
import type { Project } from "~/content/projects";
import { EARLIER_BEFORE_YEAR, allProjects, groupByYear } from "~/lib/projects";
import { HomeIntro } from "../_components/home-intro";
import {
  CompactEntry,
  LedgerEntry,
  focusRing,
} from "../_components/project-parts";

export const metadata: Metadata = { title: "Prototype 4 · Chronicle" };

const years = groupByYear(allProjects);
const recent = years.filter(({ year }) => year >= EARLIER_BEFORE_YEAR);
const earlier = years.filter(({ year }) => year < EARLIER_BEFORE_YEAR);
const earlierCount = earlier.reduce(
  (n, { projects }) => n + projects.length,
  0,
);

function Year({ year, projects }: { year: number; projects: Project[] }) {
  return (
    <section
      aria-labelledby={`year-${year}`}
      className="grid gap-x-8 gap-y-4 md:grid-cols-[5ch_1fr]"
    >
      <div className="flex items-baseline gap-3 md:sticky md:top-6 md:block md:self-start">
        <h2
          id={`year-${year}`}
          className="text-foreground text-sm leading-6 font-normal tabular-nums"
        >
          {year}
        </h2>
        <p className="text-muted-foreground/70 text-xs tabular-nums">
          {projects.length}
          <span className="md:hidden">
            {projects.length === 1 ? " project" : " projects"}
          </span>
        </p>
      </div>
      <ul>
        {projects.map((project, i) => {
          const prevFeatured = projects[i - 1]?.featured ?? false;
          return project.featured ? (
            <LedgerEntry
              key={project.title}
              project={project}
              showHost
              showYear={false}
              omitLabels={["oss"]}
              className="border-foreground/25 my-5 border-l pl-4 first:mt-0 last:mb-0 md:-ml-[17px]"
            />
          ) : (
            <CompactEntry
              key={project.title}
              project={project}
              className={i === 0 || prevFeatured ? undefined : "mt-2.5"}
            />
          );
        })}
      </ul>
    </section>
  );
}

export default function ChroniclePrototype() {
  const first = earlier.at(-1)?.year;
  const last = earlier[0]?.year;

  return (
    <div className="space-y-6">
      <HomeIntro />

      <div className="space-y-12 pt-2">
        {recent.map((group) => (
          <Year key={group.year} {...group} />
        ))}

        <details className="group">
          <summary
            className={`text-muted-foreground hover:text-foreground grid cursor-pointer list-none gap-x-8 text-sm transition-colors md:grid-cols-[5ch_1fr] [&::-webkit-details-marker]:hidden ${focusRing}`}
          >
            <span className="tabular-nums">
              {first}–{String(last).slice(2)}
            </span>
            <span>
              <span className="group-open:hidden">
                {earlierCount} earlier projects
              </span>
              <span className="hidden group-open:inline">
                hide earlier work
              </span>
              <span
                aria-hidden="true"
                className="ml-2 inline-block transition-transform group-open:rotate-90"
              >
                →
              </span>
            </span>
          </summary>
          <div className="mt-12 space-y-12">
            {earlier.map((group) => (
              <Year key={group.year} {...group} />
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
