import { createHash } from "node:crypto";

/**
 * The résumé as a file. It is printed from the résumé page by
 * scripts/resume-pdf.ts and committed, since a deploy has no browser to
 * print with; the stamp records what it was printed from, so a test can tell
 * when the page has moved on without it.
 */
export const ResumePdf = {
  /** Where the site serves it. */
  HREF: "/resume.pdf",
  /** Paths from the repository root. */
  FILE: "public/resume.pdf",
  STAMP: "scripts/resume-pdf.stamp",
  /** What the page is made of: a change to either means printing again. */
  SOURCES: ["src/app/resume/page.mdx", "src/styles/resume.css"],
  /** A fingerprint of the sources' contents, in the order of SOURCES. */
  stamp(sources: readonly string[]): string {
    const hash = createHash("sha256");
    for (const source of sources) hash.update(`${source.length}\n${source}`);
    return hash.digest("hex");
  },
} as const;
