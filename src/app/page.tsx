import Link from "next/link";
import { LockSimpleIcon } from "@phosphor-icons/react/ssr";
import { ContributionGraph } from "~/components/contribution-graph";
import { ThemeToggle } from "~/components/theme-toggle";
import {
  projects,
  type Project,
  type ProjectCategory,
} from "~/content/projects";

const navLink =
  "text-muted-foreground hover:text-foreground text-sm transition-colors";

const categorySections = [
  {
    id: "products",
    title: "Products",
    eyebrow: "live and useful",
    description:
      "Public sites and utilities with their own user-facing surface area.",
  },
  {
    id: "tools",
    title: "Tools & experiments",
    eyebrow: "personal infrastructure",
    description:
      "Developer tools, desktop helpers, hardware work, and focused prototypes.",
  },
  {
    id: "oss",
    title: "Open source contributions",
    eyebrow: "upstream and forks",
    description:
      "PRs accepted upstream plus forks that materially extend another project.",
  },
  {
    id: "games",
    title: "Games & mods",
    eyebrow: "playable things",
    description:
      "Games, mods, game-adjacent tooling, and experiments with playful surfaces.",
  },
  {
    id: "archive",
    title: "Archive / older",
    eyebrow: "school-era and retired",
    description:
      "Archived repositories, early projects, and older work kept for completeness.",
  },
] satisfies {
  id: ProjectCategory;
  title: string;
  eyebrow: string;
  description: string;
}[];

function formatProjectDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ProjectTitle({ project }: { project: Project }) {
  const title = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {project.fork ? (
        <span className="text-muted-foreground/60" aria-label="Fork">
          ⑂
        </span>
      ) : null}
      {project.locked ? (
        <LockSimpleIcon
          aria-label="Private repository"
          className="size-3.5 shrink-0 -translate-y-px"
        />
      ) : null}
      <span>{project.title}</span>
    </span>
  );

  if (!project.href) {
    return <span className="text-foreground">{title}</span>;
  }

  return (
    <a
      href={project.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground hover:text-primary transition-colors"
    >
      {title}
    </a>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="border-border flex flex-col gap-2 border-t py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-normal">
          <ProjectTitle project={project} />
        </h3>
        <time
          dateTime={project.date}
          className="text-muted-foreground/60 text-[11px]"
        >
          {formatProjectDate(project.date)}
        </time>
      </div>
      <p className="text-muted-foreground text-sm leading-normal">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {project.featured ? (
          <span className="text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5 text-[10px] tracking-[0.08em] uppercase">
            featured
          </span>
        ) : null}
        {project.labels.map((label) => (
          <span
            key={label}
            className="text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5 text-[10px] tracking-[0.08em] uppercase"
          >
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
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

      <section className="flex flex-col gap-2" aria-labelledby="projects">
        <p className="text-muted-foreground text-xs tracking-[0.12em] uppercase">
          Projects
        </p>
        <h2 id="projects" className="text-base font-normal">
          Organized by what someone is probably looking for first.
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Newest first inside each group. The archive keeps the old
          timeline&rsquo;s dates, labels, private locks, and fork markers
          without making every visitor parse one long chronology.
        </p>
      </section>

      <div className="flex flex-col gap-8">
        {categorySections.map((section) => {
          const sectionProjects = projects.filter(
            (project) => project.category === section.id,
          );
          return (
            <section
              key={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-muted-foreground text-xs tracking-[0.12em] uppercase">
                    {section.eyebrow}
                  </p>
                  <p className="text-muted-foreground/60 text-xs">
                    {sectionProjects.length} projects
                  </p>
                </div>
                <h2
                  id={`${section.id}-heading`}
                  className="text-lg font-normal"
                >
                  {section.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-normal">
                  {section.description}
                </p>
              </div>
              <div className="border-border rounded-lg border p-3">
                {sectionProjects.map((project) => (
                  <ProjectCard
                    key={`${project.date}-${project.title}`}
                    project={project}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
