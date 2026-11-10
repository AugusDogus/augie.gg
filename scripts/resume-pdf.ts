/**
 * Prints the résumé page to public/resume.pdf, the file its PDF button
 * downloads, and stamps what it was printed from.
 * Usage: bun run build && CHROME_PATH=<chrome or chromium binary> bun run resume:pdf
 */
import { chromium } from "playwright-core";
import { ResumePdf } from "../src/lib/resume-pdf";
import { SITE_URL } from "../src/lib/site";

const ROOT = new URL("../", import.meta.url);
const PORT = 3948;
const READY_MS = 30_000;

if (!(await Bun.file(new URL(".next/BUILD_ID", ROOT)).exists()))
  throw new Error(
    "There is no production build to print from. Run `bun run build` first. Nothing was modified.",
  );
const executablePath = process.env.CHROME_PATH;
if (!executablePath)
  throw new Error(
    "Set CHROME_PATH to a Chrome or Chromium binary to print with. Nothing was modified.",
  );

const server = Bun.spawn(
  [new URL("node_modules/.bin/next", ROOT).pathname, "start", "-p", `${PORT}`],
  { cwd: ROOT.pathname, stdout: "ignore", stderr: "inherit" },
);
try {
  const page = `http://localhost:${PORT}/resume`;
  const deadline = Date.now() + READY_MS;
  for (;;) {
    const ready = await fetch(page).then(
      (response) => response.ok,
      () => false,
    );
    if (ready) break;
    if (Date.now() > deadline)
      throw new Error(
        `The production server did not answer at ${page} within ${READY_MS / 1000}s. Is port ${PORT} taken? Nothing was modified.`,
      );
    await Bun.sleep(250);
  }

  const browser = await chromium.launch({ executablePath });
  try {
    const tab = await browser.newPage();
    await tab.goto(page, { waitUntil: "networkidle" });
    // Printed from localhost, so links within the site are pointed at the site.
    await tab.evaluate(async (origin) => {
      for (const link of document.querySelectorAll("a[href^='/']"))
        link.setAttribute(
          "href",
          new URL(link.getAttribute("href") ?? "/", origin).href,
        );
      await document.fonts.ready;
    }, SITE_URL);
    const pdf = await tab.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
    });
    // Each page is an object of this type; the page tree's is /Pages.
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length;
    if (pages !== 1)
      throw new Error(
        `The résumé printed to ${pages ?? "an unknown number of"} pages, and it has to fit one. Tighten it and print again. Nothing was modified.`,
      );
    const sources = await Promise.all(
      ResumePdf.SOURCES.map((path) => Bun.file(new URL(path, ROOT)).text()),
    );
    await Bun.write(new URL(ResumePdf.FILE, ROOT), pdf);
    await Bun.write(
      new URL(ResumePdf.STAMP, ROOT),
      `${ResumePdf.stamp(sources)}\n`,
    );
    console.log(
      `Résumé printed: ${ResumePdf.FILE}, one page, ${Math.round(pdf.byteLength / 1024)} KB`,
    );
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
