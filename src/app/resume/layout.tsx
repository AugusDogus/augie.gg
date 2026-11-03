import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/ssr";
import { PrintResume } from "~/components/print-resume";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export const metadata: Metadata = {
  title: "Résumé",
  description:
    "Senior software developer at Provalus since January 2023, based in Pensacola, FL. Next.js, TypeScript, CI/CD, and Playwright.",
  alternates: { canonical: "/resume" },
};

// The toolbar spans the sheet, yet its right end can still sit over bright sky
// (narrow desktops, phones), so its buttons take the .material surface.
const toolbarButton = "bg-[#16232acc] hover:bg-[#213038d9]";

export default function ResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="resume-nav relative z-20 px-(--gutter) pt-5">
        <div className="flex max-w-[760px] items-center justify-between gap-1.5">
          <Button
            variant="secondary"
            className={cn("pl-2.5", toolbarButton)}
            asChild
          >
            <Link href="/">
              <CaretLeftIcon aria-hidden="true" />
              augie.gg
            </Link>
          </Button>
          <PrintResume className={toolbarButton} />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="resume-page relative z-10 px-(--gutter) pt-[clamp(28px,6vh,64px)] pb-28"
      >
        <article className="material resume-sheet max-w-[760px]">
          {children}
        </article>
      </main>
    </>
  );
}
