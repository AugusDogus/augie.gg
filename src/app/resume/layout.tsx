import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { PrintResume } from "~/components/print-resume";
import { Card } from "~/components/ui/card";

export const metadata: Metadata = {
  title: "Résumé",
  alternates: { canonical: "/resume" },
};

export default function ResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main" tabIndex={-1} className="resume-page">
      <nav
        className="resume-nav mb-5 flex justify-between gap-4"
        aria-label="Résumé navigation"
      >
        <Button asChild>
          <Link href="/">Back to work</Link>
        </Button>
        <PrintResume />
      </nav>
      <Card className="resume-sheet">
        <article className="resume-content">{children}</article>
      </Card>
    </main>
  );
}
