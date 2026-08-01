import Link from "next/link";
import { ContributionGraph } from "~/components/contribution-graph";
import { ThemeToggle } from "~/components/theme-toggle";
import { timelineComponents } from "~/components/timeline-components";
import Timeline from "~/content/timeline.mdx";

const navLink =
  "text-muted-foreground hover:text-foreground text-sm transition-colors";

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

      <Timeline components={timelineComponents} />
    </div>
  );
}
