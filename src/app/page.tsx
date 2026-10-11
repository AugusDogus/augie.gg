import Link from "next/link";
import { ContributionGraph } from "~/components/contribution-graph";
import { ThemeToggle } from "~/components/theme-toggle";
import { timelineComponents } from "~/components/timeline-components";
import Timeline from "~/content/timeline.mdx";

const navLink =
  "text-muted-foreground hover:text-foreground text-sm transition-colors";

const selectedProjects = [
  {
    title: "whisp.chat",
    href: "https://whisp.chat",
    date: "2025-09-30",
    tag: "active product",
    blurb: "Ephemeral messages and photos, live on its own domain.",
    why: "A shipped, public product with the clearest consumer-facing surface.",
  },
  {
    title: "junkyardindex.com",
    href: "https://junkyardindex.com",
    date: "2025-07-31",
    tag: "active product",
    blurb: "Nationwide salvage yard inventory search.",
    why: "Useful, live, and specific enough to stand apart from experiments.",
  },
  {
    title: "opentab.sh",
    href: "https://opentab.sh",
    date: "2025-12-16",
    tag: "active product",
    blurb: "Send tabs to your devices instantly.",
    why: "A tiny product with a memorable domain and direct utility.",
  },
  {
    title: "contacts",
    href: "https://contacts.exchange",
    date: "2026-10-03",
    tag: "live utility",
    blurb:
      "An address book where invitees fill in their own details for Google Contacts or vCard export.",
    why: "A polished, real-world workflow more substantial than a code sample.",
  },
  {
    title: "Valheim mods",
    href: "https://thunderstore.io/c/valheim/p/AugusDogus/",
    date: "2026-09-11",
    tag: "active mods",
    blurb:
      "Seven client and server mods, including Buildheim, ComfortView, and Soundheim.",
    why: "A visible ecosystem contribution with distribution beyond GitHub.",
  },
  {
    title: "DashSplit",
    href: "https://dashsplit.vercel.app",
    date: "2026-08-30",
    tag: "static app",
    blurb:
      "A fully static bill splitter for delivery receipts, with in-browser OCR and share links.",
    why: "A sharp example of fast, privacy-friendly browser tooling.",
  },
  {
    title: "cubefarm",
    href: "https://cubefarm.vercel.app",
    date: "2026-10-04",
    tag: "game",
    blurb:
      "An incremental office game where employees, workflows, and company choices grow a corporation.",
    why: "A playful, finished-feeling project that balances the product list.",
  },
  {
    title: "cursor-acp-auth-shim",
    href: "https://github.com/AugusDogus/cursor-acp-auth-shim",
    date: "2026-07-31",
    tag: "active oss",
    blurb:
      "A Rust, C, Go, and Bun compatibility shim for Cursor Agent API-key auth.",
    why: "A technical, maintained project with benchmarks and practical developer value.",
  },
];

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

      <section aria-labelledby="selected-work" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs tracking-[0.12em] uppercase">
            Selected work
          </p>
          <h2 id="selected-work" className="text-base font-normal">
            Shipped products, active tools, and higher-signal experiments.
          </h2>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {selectedProjects.map((project) => (
            <article
              key={project.href}
              className="border-border bg-card/40 flex flex-col gap-3 rounded-lg border p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {project.title}
                </a>
                <span className="text-muted-foreground/60 text-[11px]">
                  {project.date}
                </span>
              </div>
              <p className="text-muted-foreground text-sm leading-normal">
                {project.blurb}
              </p>
              <div className="mt-auto flex flex-col gap-2">
                <span className="text-muted-foreground/60 w-fit rounded-full bg-muted px-2 py-1 text-[10px] tracking-[0.08em] uppercase">
                  {project.tag}
                </span>
                <p className="text-muted-foreground/80 text-xs leading-relaxed">
                  {project.why}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="everything" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs tracking-[0.12em] uppercase">
            Everything
          </p>
          <h2 id="everything" className="sr-only">
            Full chronological project timeline
          </h2>
          <p className="text-muted-foreground text-sm">
            The full ledger stays chronological below, including private work,
            forks, school-era projects, labels, and original dates.
          </p>
        </div>
        <Timeline components={timelineComponents} />
      </section>
    </div>
  );
}
