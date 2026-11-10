import { describe, expect, test } from "bun:test";
import { ResumePdf } from "./resume-pdf";

describe("ResumePdf.stamp", () => {
  test("is the same for the same sources", () => {
    expect(ResumePdf.stamp(["# Name", "h1 {}"])).toBe(
      ResumePdf.stamp(["# Name", "h1 {}"]),
    );
  });

  test("changes when any source changes", () => {
    const stamp = ResumePdf.stamp(["# Name", "h1 {}"]);
    expect(ResumePdf.stamp(["# Name.", "h1 {}"])).not.toBe(stamp);
    expect(ResumePdf.stamp(["# Name", "h1 { }"])).not.toBe(stamp);
  });

  test("tells where one source ends and the next begins", () => {
    expect(ResumePdf.stamp(["ab", "c"])).not.toBe(ResumePdf.stamp(["a", "bc"]));
  });
});

describe("public/resume.pdf", () => {
  test("was printed from the résumé as it is now", async () => {
    const root = new URL("../../", import.meta.url);
    const sources = await Promise.all(
      ResumePdf.SOURCES.map((path) => Bun.file(new URL(path, root)).text()),
    );
    const printed = await Bun.file(new URL(ResumePdf.STAMP, root)).text();
    if (printed.trim() !== ResumePdf.stamp(sources))
      throw new Error(
        `public/resume.pdf was printed from an older résumé: ${ResumePdf.SOURCES.join(" or ")} changed since. The page itself is fine, but the download no longer matches it. Print it again with: bun run build && CHROME_PATH=<chrome binary> bun run resume:pdf`,
      );
    expect(await Bun.file(new URL(ResumePdf.FILE, root)).exists()).toBe(true);
  });
});
