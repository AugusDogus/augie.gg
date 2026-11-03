import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeftIcon, FileTextIcon } from "@phosphor-icons/react/ssr";
import { Button } from "~/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="relative z-10 px-(--gutter) pt-[clamp(56px,18vh,224px)] pb-16"
    >
      <section className="material max-w-[600px] p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="display text-[clamp(34px,4.2vw,48px)]">
            Nothing here
          </h1>
          <span className="text-fg-3 font-mono text-[13px]">404</span>
        </div>
        <p className="text-fg-2 mt-4 max-w-[31em] text-[17px]/[1.55] text-pretty">
          This page doesn’t exist. Either the link is wrong, or I moved
          something and forgot to fix it.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Button variant="primary" className="pl-2.5" asChild>
            <Link href="/">
              <CaretLeftIcon aria-hidden="true" />
              augie.gg
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/resume">
              <FileTextIcon aria-hidden="true" />
              Résumé
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
