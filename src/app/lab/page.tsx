import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { notFound } from "next/navigation";
import { Button } from "~/components/ui/button";

export const metadata: Metadata = {
  title: "Lab",
  robots: { index: false, follow: false },
};

const prototypes = [
  {
    href: "/lab/stage",
    name: "Stage",
    summary:
      "The list stays a list; hover or focus a project and its capture shows up big over the painting.",
  },
  {
    href: "/lab/cards",
    name: "Cards",
    summary:
      "Every project gets a glass card led by its capture, and recordings play while they’re on screen.",
  },
  {
    href: "/lab/rail",
    name: "Rail",
    summary:
      "A strip of captures you can swipe or arrow through, above a compact list of the same projects.",
  },
] as const;

export default function Lab() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <main
      id="main"
      tabIndex={-1}
      className="relative z-10 px-(--gutter) pt-[clamp(72px,14vh,168px)] pb-28"
    >
      <section className="max-w-[600px]">
        <Button variant="secondary" className="pl-2.5" asChild>
          <Link href="/">
            <CaretLeftIcon aria-hidden="true" />
            Home
          </Link>
        </Button>
        <h1 className="display mt-8 text-[clamp(40px,5.2vw,64px)] text-balance">
          Selected work, three ways
        </h1>
        <p className="text-fg-2 mt-5 max-w-[31em] text-[17px]/[1.55] text-pretty">
          Prototypes for showing the projects with real screenshots and
          recordings. Each one is the full home page with only that part swapped
          out.
        </p>
        <ul className="material mt-10 flex flex-col p-1.5">
          {prototypes.map((prototype) => (
            <li key={prototype.href}>
              <Link
                href={prototype.href}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-[10px] px-3.5 py-3 -outline-offset-2 transition-[background-color] duration-150 ease-out pointer-fine:hover:bg-white/[.05] pointer-fine:hover:duration-0"
              >
                <span className="text-fg text-[15px] font-medium">
                  {prototype.name}
                </span>
                <CaretRightIcon
                  aria-hidden="true"
                  className="text-fg-3 group-hover:text-fg-2 row-span-2 size-4 transition-colors duration-150"
                />
                <span className="text-fg-2 mt-0.5 text-sm/[1.5] text-pretty">
                  {prototype.summary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
