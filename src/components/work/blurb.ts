/** A run of blurb text: plain, or an inline `[text](url)` link. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

const INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export const Blurb = {
  parse(source: string): Segment[] {
    const segments: Segment[] = [];
    const text = (value: string) => {
      if (value) segments.push({ kind: "text", text: value });
    };
    let cursor = 0;
    for (const match of source.matchAll(INLINE_LINK)) {
      const [whole, label, href] = match;
      if (label === undefined || href === undefined) continue;
      text(source.slice(cursor, match.index));
      segments.push({ kind: "link", text: label, href });
      cursor = match.index + whole.length;
    }
    text(source.slice(cursor));
    return segments;
  },
  /** The blurb as it reads, for places that cannot hold links (inside a button). */
  plain(source: string): string {
    return Blurb.parse(source)
      .map((segment) => segment.text)
      .join("");
  },
} as const;
