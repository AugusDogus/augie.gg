import Link from "next/link";
import { FileTextIcon } from "@phosphor-icons/react/ssr";
import { Activity } from "~/components/activity";
import { CommandMenu, CommandMenuTrigger } from "~/components/command-menu";
import { CopyEmailButton } from "~/components/copy-email";
import { Dock } from "~/components/dock";
import { GithubButton } from "~/components/github-button";
import { NameHeading } from "~/components/name-heading";
import { ProjectPeek } from "~/components/project-peek";
import { Button } from "~/components/ui/button";
import { OpenSource } from "~/components/work/open-source";
import { WorkList } from "~/components/work-list";

/** The home page: the hero, Selected work, open source, and activity over the painting. */
export function Home() {
  return (
    <>
      {/*
        A drag over the painting steers it, so empty space never starts a text
        selection: only the name, the intro and the cards opt back in. Buttons
        in the cards return to auto, so clicking a row selects nothing.
      */}
      <div className="select-none">
        {/*
          Where the dock is pinned, so are these: they stay over the painting,
          clear of the column, as the page scrolls. Only the buttons take the
          pointer, so the page under the rest of the row still does.
        */}
        <header className="pointer-events-none relative z-20 flex items-center justify-end gap-1.5 px-(--gutter) pt-5 *:pointer-events-auto [@media(width>1000px)_and_(aspect-ratio>5/4)]:sticky [@media(width>1000px)_and_(aspect-ratio>5/4)]:top-0">
          <CommandMenuTrigger />
          <GithubButton />
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="relative z-10 px-(--gutter) pb-10 [@media(width>1000px)_and_(aspect-ratio>5/4)]:pb-28"
        >
          <section className="max-w-[600px] pt-[clamp(40px,8vh,128px)]">
            <NameHeading className="display rise w-fit text-[clamp(44px,5.2vw,76px)] select-text [--i:0]" />
            <p className="text-fg-2 rise mt-5 max-w-[31em] text-[17px]/[1.55] text-pretty select-text [--i:1]">
              Product engineer in Pensacola, FL. Building things with{" "}
              <a
                href="https://www.amli.com"
                target="_blank"
                rel="noopener noreferrer"
                className="decoration-fg-3 hover:decoration-fg underline underline-offset-[3px] transition-[text-decoration-color] duration-150 ease-out"
              >
                AMLI
              </a>
              .
            </p>
            <div className="rise mt-8 flex flex-wrap gap-2.5 [--i:2]">
              <CopyEmailButton />
              <Button variant="secondary" asChild>
                <Link href="/resume">
                  <FileTextIcon aria-hidden="true" />
                  Résumé
                </Link>
              </Button>
            </div>
          </section>
          <div className="rise-each mt-[clamp(40px,6vh,80px)] flex max-w-[600px] flex-col gap-4 [--i:3] *:select-text [&_button]:select-auto">
            <WorkList />
            <OpenSource />
            <Activity />
          </div>
        </main>
        <Dock />
      </div>
      <ProjectPeek />
      <CommandMenu />
    </>
  );
}
