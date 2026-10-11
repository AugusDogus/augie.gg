import Link from "next/link";
import { ContributionGraph } from "~/components/contribution-graph";
import { ThemeToggle } from "~/components/theme-toggle";

const navLink =
  "text-muted-foreground hover:text-foreground text-sm transition-colors";

/** The home page's header, name, and contribution graph, unchanged. */
export function HomeIntro() {
  return (
    <>
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
    </>
  );
}
