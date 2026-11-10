import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  CaretLeftIcon,
  FilePdfIcon,
} from "@phosphor-icons/react/ssr";
import { Dock } from "~/components/dock";
import { Button } from "~/components/ui/button";
import { ResumePdf } from "~/lib/resume-pdf";
import { cn } from "~/lib/utils";

export const metadata: Metadata = {
  title: "Résumé",
  description:
    "Senior software developer building AMLI.com and Ask AMLI, based in Pensacola, FL. Next.js, TypeScript, React Native, and Rust.",
  alternates: {
    canonical: "/resume",
    types: { "application/pdf": ResumePdf.HREF },
  },
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
    // A drag over the painting steers it, so only the sheet starts a text selection.
    <div className="select-none">
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
          {/* The browser's own viewer prints it or saves it. */}
          <Button variant="secondary" className={toolbarButton} asChild>
            <a
              href={ResumePdf.HREF}
              target="_blank"
              rel="noopener"
              aria-label="Open the résumé as a PDF"
            >
              <FilePdfIcon aria-hidden="true" />
              PDF
              <ArrowUpRightIcon aria-hidden="true" />
            </a>
          </Button>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="resume-page relative z-10 px-(--gutter) pt-[clamp(28px,6vh,64px)] pb-10 min-[1240px]:pb-28"
      >
        <article className="material resume-sheet max-w-[760px] select-text">
          {children}
        </article>
      </main>
      {/* The painting plays here as it does at home, so its pause and credit come too. */}
      <Dock column="resume" />
    </div>
  );
}
