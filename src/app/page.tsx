import Link from "next/link";
import {
  FileTextIcon,
  GithubLogoIcon,
  CaretDownIcon,
} from "@phosphor-icons/react/ssr";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Accordion } from "~/components/ui/accordion";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "~/components/ui/collapsible";
import {
  FeaturedEntry,
  ArchiveEntry,
  ExternalLink,
} from "~/components/projects";
import { EmailCopy } from "~/components/email-copy";
import { ArtworkCaption } from "~/components/flight-background";
import {
  featuredProjects,
  archivedProjects,
  notableContributions,
  groupByYear,
} from "~/lib/projects";

export default function HomePage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="portfolio-page px-(--gutter) pt-[34px] pb-6 max-[600px]:pt-[26px]"
    >
      <header className="site-header mb-[30px] flex items-center justify-between gap-6 max-[600px]:mb-[25px] max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-5">
        <div>
          <h1 className="font-[family-name:var(--font-newsreader)] text-[34px]/[1.15] font-medium tracking-[-.015em] text-[#f1f2e9] [text-shadow:0_1px_12px_#19344040] max-[600px]:text-[30px]">
            Augie Luebbers
          </h1>
          <p className="mt-[9px] font-[system-ui,sans-serif] text-xs/normal text-[#e0e7e3] [text-shadow:0_1px_6px_#19344066]">
            Product Engineer
          </p>
        </div>
        <nav className="flex flex-wrap gap-[9px]" aria-label="Personal links">
          <Button asChild>
            <Link href="/resume">
              <FileTextIcon aria-hidden="true" />
              Résumé
            </Link>
          </Button>
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
        </nav>
      </header>
      <div className="portfolio-content w-full max-w-[560px] max-[1000px]:max-w-[520px]">
        <Card
          className="work-sheet px-[26px] pt-[23px] max-[600px]:rounded-[15px] max-[600px]:px-5 max-[600px]:pt-5"
          aria-labelledby="work-title"
        >
          <h2
            id="work-title"
            className="pb-[17px] text-[17px]/[1.4] font-medium tracking-[-.02em] max-[600px]:pb-[15px]"
          >
            Selected work
          </h2>
          <Accordion type="multiple">
            {featuredProjects.map((project) => (
              <FeaturedEntry key={project.title} project={project} />
            ))}
          </Accordion>
          <Collapsible className="more-work border-border border-t">
            <CollapsibleTrigger className="more-trigger flex w-full items-center justify-between py-5 text-[13px] font-medium [&>svg]:size-3.5 [&>svg]:text-[#718087] data-[state=open]:[&>svg]:rotate-180">
              Everything else
              <CaretDownIcon aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent className="project-history pb-[18px]">
              {groupByYear(archivedProjects).map((group) => (
                <section className="project-year pt-[25px]" key={group.year}>
                  <h3 className="text-muted-foreground mb-[15px] text-xs/[1.6] font-medium">
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
        <footer className="site-footer flex flex-wrap items-center justify-between gap-x-6 gap-y-[18px] px-[3px] pt-[23px] pb-3 text-[#e0e7e2] [text-shadow:0_1px_7px_#19344080] max-[600px]:gap-x-[18px] max-[600px]:pt-[22px] [&>.email-contact]:ml-auto [&>.email-contact]:shrink-0">
          <div className="contributions max-w-full flex-none">
            <h2 className="mb-2.5 text-[11px] font-normal">
              Open source (minor) contributions
            </h2>
            <div className="flex flex-wrap gap-[18px]">
              {notableContributions.map(
                (project) =>
                  project.href && (
                    <ExternalLink
                      key={project.title}
                      href={project.href}
                      className="inline-flex items-center gap-1.5 text-[11px] hover:text-white"
                    >
                      {project.contributionName ?? project.title}
                    </ExternalLink>
                  ),
              )}
            </div>
          </div>
          <EmailCopy />
        </footer>
      </div>
      <ArtworkCaption />
    </main>
  );
}
