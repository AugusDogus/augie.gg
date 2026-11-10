import { getImageProps } from "next/image";
import type { Project } from "~/content/projects";
import { featuredProjects } from "~/lib/projects";
import { stageLayout } from "./layout";
import { savesData } from "./save-data";
import { Showcase, type Still } from "./showcase";

/**
 * The width the sheet shows a lead capture at, as an image's `sizes`. The
 * sheet passes this on, so a still fetched ahead is the one it then asks for.
 */
export const SHEET_LEAD = "(max-width: 640px) calc(100vw - 12px), 628px";

/** How long after the page has loaded the featured projects wait, so they never compete with it. */
const SETTLE_MS = 1500;

/** Every still already asked for, and the fetches in flight, held so they are not collected. */
const asked = new Set<string>();
const flying = new Set<HTMLImageElement>();

/** Asks for a still exactly as its capture's frame will, so that fetch finds it here. */
function fetchStill(still: Still, priority: "low" | "auto") {
  const key = `${still.src} ${still.sizes}`;
  if (asked.has(key)) return;
  asked.add(key);
  const { props } = getImageProps({
    src: still.src,
    alt: "",
    width: still.width,
    height: still.height,
    sizes: still.sizes,
    unoptimized: still.original,
  });
  const image = new Image();
  const landed = () => flying.delete(image);
  image.onload = landed;
  image.onerror = landed;
  image.fetchPriority = priority;
  // `sizes` before `srcset`, so the browser chooses its candidate once.
  if (props.sizes !== undefined) image.sizes = props.sizes;
  if (props.srcSet !== undefined) image.srcset = props.srcSet;
  flying.add(image);
  image.src = props.src;
}

/**
 * Fetches a project's stills before it is opened, so the sheet opens onto
 * its captures instead of waiting for them. Only where projects open in the
 * sheet: a stage card's width is its own, so its still cannot be asked for
 * ahead, and hovering a row already starts it. Never with Save-Data.
 */
export const Warm = {
  project(project: Project | null, priority: "low" | "auto" = "auto") {
    if (project === null || stageLayout() || savesData()) return;
    const showcase = Showcase.of(project.media);
    if (showcase === null) return;
    for (const still of Showcase.stills(showcase, SHEET_LEAD))
      fetchStill(still, priority);
  },
  /**
   * The featured projects, the likeliest to be opened, at low priority once
   * the page has loaded and settled. Returns a cancel.
   */
  featured(): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      timer = setTimeout(() => {
        for (const project of featuredProjects) Warm.project(project, "low");
      }, SETTLE_MS);
    };
    if (document.readyState === "complete") settle();
    else window.addEventListener("load", settle, { once: true });
    return () => {
      window.removeEventListener("load", settle);
      clearTimeout(timer);
    };
  },
} as const;
