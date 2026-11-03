import Link from "next/link";
import {
  CaretDownIcon,
  FileTextIcon,
  GithubLogoIcon,
} from "@phosphor-icons/react/ssr";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "~/components/ui/collapsible";
import {
  FeaturedEntry,
  ArchiveEntry,
  ExternalLink,
  othersClause,
} from "~/components/projects";
import { ContributionCalendar } from "~/components/contribution-calendar";
import { EmailCopy } from "~/components/email-copy";
import { ArtworkCaption } from "~/components/flight-background";
import {
  featuredProjects,
  archivedProjects,
  notableContributions,
  otherContributions,
  earliestYear,
  groupByYear,
} from "~/lib/projects";

export default function HomePage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="portfolio-page px-(--gutter) pt-11 pb-8 max-[600px]:pt-7"
    >
      <header className="on-sky text-paper">
        <h1 className="sky-name -ml-[.04em] text-[clamp(44px,6.4vw,96px)]/[.9] font-medium tracking-[-.024em] whitespace-nowrap">
          Augie Luebbers
        </h1>
        <p className="sky-role mt-[clamp(12px,1.2vw,18px)] text-2xl/[1.25] font-medium tracking-[-.008em] text-balance max-[600px]:mt-[calc(72.8333vw-96px)]">
          Product engineer in Pensacola, Florida
        </p>
        <nav
          className="mt-5 flex flex-wrap gap-2.5 max-[600px]:grid max-[600px]:grid-cols-2"
          aria-label="Contact"
        >
          <span className="max-[600px]:col-span-2">
            <EmailCopy appearance="primary" />
          </span>
          <Button asChild>
            <a
              href="https://github.com/AugusDogus"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubLogoIcon aria-hidden="true" />
              GitHub
            </a>
          </Button>
          <Button asChild>
            <Link href="/resume">
              <FileTextIcon aria-hidden="true" />
              Résumé
            </Link>
          </Button>
        </nav>
      </header>
      <Card
        className="sheet mt-9 w-[calc(var(--measure)+58px)] max-w-full px-7 pt-[26px] pb-1.5 max-[600px]:-mx-1.5 max-[600px]:mt-7 max-[600px]:max-w-[calc(100%+12px)] max-[600px]:px-[18px] max-[600px]:pt-5 max-[600px]:pb-1"
        aria-label="About and work"
      >
        <p className="text-[clamp(18.5px,1.45vw,20px)]/[1.45] text-pretty">
          I’m a senior software developer at Provalus and the lead maintainer of
          AMLI.com. I&nbsp;also build my own software, from browser extensions
          to GameCube clients, in TypeScript, Rust, and C.
        </p>
        <ContributionCalendar />
        <h2
          id="work-title"
          className="mt-[30px] text-[22px]/[1.25] font-medium tracking-[-.01em]"
        >
          Selected work
        </h2>
        <ul
          className="border-border mt-3 border-t"
          aria-labelledby="work-title"
        >
          {featuredProjects.map((project) => (
            <FeaturedEntry key={project.title} project={project} />
          ))}
        </ul>
        <p className="border-border text-muted-foreground border-b py-[18px] text-[15px]/[1.6] text-pretty">
          <b className="text-ink font-semibold">
            OSS (albeit minor) contributions:
          </b>{" "}
          {notableContributions.map(
            (project, i) =>
              project.href && (
                <span key={project.title}>
                  <ExternalLink
                    href={project.href}
                    className="text-ink font-mono text-[14px] whitespace-nowrap underline decoration-[var(--link-rest)] decoration-1 underline-offset-4 transition-[text-decoration-color] duration-[120ms] hover:decoration-current"
                  >
                    {project.title}
                  </ExternalLink>
                  {i < notableContributions.length - 1 || otherContributions > 0
                    ? ", "
                    : ""}
                </span>
              ),
          )}
          {othersClause(otherContributions)}.
        </p>
        <Collapsible>
          <h2 className="text-[22px]/[1.25] font-medium tracking-[-.01em]">
            <CollapsibleTrigger className="group flex min-h-16 w-full items-center gap-3 text-left">
              Everything else
              <span className="text-muted-foreground ml-auto text-[14px] font-normal tracking-normal tabular-nums">
                {archivedProjects.length} projects since {earliestYear}
              </span>
              <CaretDownIcon
                className="text-muted-foreground group-hover:text-ink size-3.5 transition-transform duration-[160ms] ease-out group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </CollapsibleTrigger>
          </h2>
          <CollapsibleContent className="pb-[18px]">
            {groupByYear(archivedProjects).map((group) => (
              <section
                className="archive-year gap-x-[18px] pt-5 md:grid md:grid-cols-[4.2ch_1fr]"
                key={group.year}
                aria-labelledby={`year-${group.year}`}
              >
                <h3
                  id={`year-${group.year}`}
                  className="text-muted-foreground mb-2 self-start text-[14px] font-semibold tabular-nums md:sticky md:top-4 md:mb-0"
                >
                  {group.year}
                </h3>
                <ul>
                  {group.projects.map((project) => (
                    <ArchiveEntry key={project.title} project={project} />
                  ))}
                </ul>
              </section>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <ArtworkCaption />
    </main>
  );
}
