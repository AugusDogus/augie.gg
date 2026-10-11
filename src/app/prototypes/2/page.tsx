import type { Metadata } from "next";
import type { Project } from "~/content/projects";
import { SECTIONS, allProjects, groupByYear, sectionOf } from "~/lib/projects";
import { HomeIntro } from "../_components/home-intro";
import {
  CompactEntry,
  LedgerEntry,
  focusRing,
} from "../_components/project-parts";

export const metadata: Metadata = { title: "Prototype 2 · Shelves" };

const shelves = SECTIONS.map((section) => {
  const projects = allProjects.filter((p) => sectionOf(p) === section.id);
  const years = projects.map((p) => Number(p.date.slice(0, 4)));
  return {
    ...section,
    projects,
    range: `${Math.min(...years)}–${Math.max(...years)}`,
  };
});

/** Standout entries lead each shelf; the rest follow newest first. */
function ShelfList({
  projects,
  omitOss,
}: {
  projects: Project[];
  omitOss: boolean;
}) {
  const featured = projects.filter((project) => project.featured);
  const rest = projects.filter((project) => !project.featured);
  const omitLabels = omitOss ? (["oss"] as const) : undefined;
  return (
    <div className="space-y-8">
      {featured.length > 0 && (
        <ul className="space-y-6">
          {featured.map((project) => (
            <LedgerEntry
              key={project.title}
              project={project}
              omitLabels={omitLabels}
              showHost
            />
          ))}
        </ul>
      )}
      {rest.length > 0 && (
        <ul className="space-y-5">
          {rest.map((project) => (
            <LedgerEntry
              key={project.title}
              project={project}
              size="sm"
              omitLabels={omitLabels}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ShelvesPrototype() {
  return (
    <div className="space-y-6">
      <HomeIntro />

      <nav aria-label="Project sections" className="pt-2">
        <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {shelves.map((shelf) => (
            <li key={shelf.id}>
              <a
                href={`#${shelf.id}`}
                className={`hover:text-foreground transition-colors ${focusRing}`}
              >
                {shelf.title.toLowerCase()}
                <span className="text-muted-foreground/60 ml-1.5 tabular-nums">
                  {shelf.projects.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-16 pt-6">
        {shelves.map((shelf) => {
          const title = (
            <h2
              id={`${shelf.id}-heading`}
              className="flex items-baseline gap-3 font-normal"
            >
              <span className="text-foreground text-sm">{shelf.title}</span>
              <span className="text-muted-foreground/70 text-xs tabular-nums">
                {shelf.projects.length}
              </span>
            </h2>
          );
          const description = (
            <span className="text-muted-foreground mt-1 block text-xs leading-normal">
              {shelf.description}
            </span>
          );

          if (shelf.id === "earlier") {
            return (
              <section
                key={shelf.id}
                id={shelf.id}
                aria-labelledby={`${shelf.id}-heading`}
                className="scroll-mt-6"
              >
                <details className="group">
                  <summary
                    className={`grid cursor-pointer list-none grid-cols-[1fr_auto] items-baseline gap-x-4 [&::-webkit-details-marker]:hidden ${focusRing}`}
                  >
                    {title}
                    <span className="text-muted-foreground group-hover:text-foreground text-xs transition-colors">
                      <span className="group-open:hidden">
                        show {shelf.range}
                      </span>
                      <span className="hidden group-open:inline">hide</span>
                    </span>
                    {description}
                  </summary>
                  <div className="mt-6 space-y-6">
                    {groupByYear(shelf.projects).map(({ year, projects }) => (
                      <div
                        key={year}
                        className="grid gap-x-6 gap-y-2 md:grid-cols-[4ch_1fr]"
                      >
                        <h3 className="text-muted-foreground/80 text-xs leading-6 font-normal tabular-nums">
                          {year}
                        </h3>
                        <ul className="space-y-2.5">
                          {projects.map((project) => (
                            <CompactEntry
                              key={project.title}
                              project={project}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              </section>
            );
          }

          return (
            <section
              key={shelf.id}
              id={shelf.id}
              aria-labelledby={`${shelf.id}-heading`}
              className="scroll-mt-6"
            >
              <div className="mb-6">
                {title}
                {description}
              </div>
              <ShelfList
                projects={shelf.projects}
                omitOss={shelf.id === "oss"}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
