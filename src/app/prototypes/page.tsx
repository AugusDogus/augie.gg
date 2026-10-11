import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "~/components/header";
import { allProjects } from "~/lib/projects";
import { eyebrow, focusRing } from "./_components/project-parts";
import { PROTOTYPES, prototypeHref } from "./_components/registry";

export const metadata: Metadata = {
  title: "Prototypes",
};

export default function PrototypesIndex() {
  const featured = allProjects.filter((project) => project.featured).length;

  return (
    <div className="space-y-10">
      <Header />

      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
          Project layouts
        </h1>
        <p className="text-muted-foreground max-w-[60ch] text-sm leading-relaxed">
          Four ways to organize the home page. Each renders the same{" "}
          {allProjects.length} entries from one typed source, with {featured}{" "}
          marked as standout work. The live page is untouched.
        </p>
      </div>

      <ol className="space-y-1">
        {PROTOTYPES.map((prototype) => (
          <li key={prototype.slug}>
            <Link
              href={prototypeHref(prototype.slug)}
              className={`group hover:bg-foreground/[0.04] -mx-3 grid grid-cols-[2ch_1fr] gap-x-4 rounded-md px-3 py-3 transition-colors ${focusRing}`}
            >
              <span className="text-muted-foreground text-sm tabular-nums">
                {prototype.slug}
              </span>
              <span className="space-y-1">
                <span className="text-foreground block text-base">
                  {prototype.name}
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground ml-2 inline-block transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
                <span className="text-muted-foreground block text-sm leading-normal">
                  {prototype.pitch}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <p className={eyebrow}>
        <Link
          href="/"
          className={`hover:text-foreground transition-colors ${focusRing}`}
        >
          ← current design
        </Link>
      </p>
    </div>
  );
}
