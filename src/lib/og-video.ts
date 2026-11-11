/**
 * The link preview's video: the home card with the painting playing behind
 * its words, for one pass of the mother and calf (lib/flight/pass.ts), which
 * loops. scripts/og-video.tsx renders it.
 */
export const OgVideo = {
  /** Where the site serves it. */
  HREF: "/og-video.mp4",
  /** Its path from the repository root. */
  FILE: "public/og-video.mp4",
  /** Its first frame, which is the card a preview without video shows. */
  STILL: "src/app/opengraph-image.jpg",
  /** That frame without the card's words: what every project's card is drawn on. */
  BACKDROP: "src/assets/card-backdrop.jpg",
  FPS: 30,
  /** How long the end of the pass dissolves into its start, while no whale of the pair shows. */
  DISSOLVE_SECONDS: 0.5,
  /** How long the far whale takes to come in after that dissolve and go out before it. */
  FAR_FADE_SECONDS: 2,
} as const;
