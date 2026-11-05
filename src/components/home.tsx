import Link from "next/link";
import { FileTextIcon } from "@phosphor-icons/react/ssr";
import { Activity } from "~/components/activity";
import { CommandMenu, CommandMenuTrigger } from "~/components/command-menu";
import { CopyEmailButton } from "~/components/copy-email";
import { Dock } from "~/components/dock";
import { GithubButton } from "~/components/github-button";
import { ProjectPeek } from "~/components/project-peek";
import { Settled } from "~/components/settled";
import { Button } from "~/components/ui/button";
import { OpenSource } from "~/components/work/open-source";
import { WorkList } from "~/components/work-list";

/** The home page: the hero, Selected work, open source, and activity over the painting. */
export function Home() {
  return (
    <>
      <header className="relative z-20 flex items-center justify-end gap-1.5 px-(--gutter) pt-5">
        <CommandMenuTrigger />
        <GithubButton />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="relative z-10 px-(--gutter) pb-10 [@media(width>1000px)_and_(aspect-ratio>5/4)]:pb-28"
      >
        <section className="max-w-[600px] pt-[clamp(72px,14vh,168px)]">
          <h1 className="display rise text-[clamp(44px,5.2vw,76px)] [--i:0]">
            Augie Luebbers
          </h1>
          <p className="text-fg-2 rise mt-5 max-w-[31em] text-[17px]/[1.55] text-pretty [--i:1]">
            Product engineer in Pensacola, FL. I notice something annoying, fix
            it, and move&nbsp;on. Sometimes the fix is a Plex client for the
            GameCube.
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
        <div className="rise-each mt-[clamp(48px,8vh,96px)] flex max-w-[600px] flex-col gap-4 [--i:3]">
          <WorkList />
          <OpenSource />
          <Activity />
        </div>
      </main>
      <Dock />
      <ProjectPeek />
      <CommandMenu />
      <Settled />
    </>
  );
}
