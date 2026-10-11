export interface Prototype {
  slug: string;
  name: string;
  pitch: string;
}

export const PROTOTYPES: readonly Prototype[] = [
  {
    slug: "1",
    name: "Selected",
    pitch:
      "A short, annotated list of standout work and merged open source, then everything else as a compact year-by-year archive.",
  },
  {
    slug: "2",
    name: "Shelves",
    pitch:
      "Sections by kind of work, each led by its standout entries, with earlier years tucked behind a disclosure.",
  },
  {
    slug: "3",
    name: "Index",
    pitch:
      "One dense, scannable list with category filters and search, for visitors who know what they are looking for.",
  },
  {
    slug: "4",
    name: "Chronicle",
    pitch:
      "The current timeline, weighted: standout work gets room to breathe inline, everything else condenses to one line.",
  },
];

export function prototypeHref(slug: string): string {
  return `/prototypes/${slug}`;
}
