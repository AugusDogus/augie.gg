import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeftIcon, FileTextIcon } from "@phosphor-icons/react/ssr";
import { Dock } from "~/components/dock";
import { Button } from "~/components/ui/button";
import { WhaleLoader } from "~/components/work/whale-loader";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    // A drag over the painting steers it, so only the card starts a text selection.
    <div className="select-none">
      <main
        id="main"
        tabIndex={-1}
        className="relative z-10 px-(--gutter) pt-[clamp(56px,18vh,224px)] pb-10 [@media(width>1000px)_and_(aspect-ratio>5/4)]:pb-28"
      >
        <section className="material max-w-[600px] p-1.5 select-text">
          {/* The painting's mother and calf, swimming over the card's own glass: no ground of their own, and gone into it at either side. */}
          <div className="@container relative aspect-[3/1] max-h-[172px] [mask-image:linear-gradient(90deg,transparent,#000_22%,#000_78%,transparent)]">
            <WhaleLoader />
          </div>
          <div className="px-4.5 pt-5 pb-4.5 sm:px-6.5 sm:pt-6 sm:pb-6.5">
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
          </div>
        </section>
      </main>
      {/* The painting plays here as it does at home, so its pause and credit come too. */}
      <Dock />
    </div>
  );
}
