/** What the command menu searches for one row. */
export interface Searchable {
  title: string;
  keywords: readonly string[];
  /** Prose, so it matches by word start or substring but never by scattered letters. */
  blurb: string;
}

const INLINE_LINK = /\[([^\]]+)\]\([^)\s]+\)/g;

/** A blurb as plain text: `[text](url)` becomes `text`. */
export function plainText(markdown: string): string {
  return markdown.replace(INLINE_LINK, "$1");
}

const PREFIX = 3;
const WORD = 2;
const SUBSEQUENCE = 1;
type Tier = typeof PREFIX | typeof WORD | typeof SUBSEQUENCE;

const FIELD = { title: 2, keyword: 1, blurb: 0 } as const;

/** Accents and marks dropped, case kept, so `résumé` and `resume` match. */
function strip(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

const ALNUM = /[\p{L}\p{N}]/u;
const LOWER = /\p{Ll}/u;
const UPPER = /\p{Lu}/u;

function isWordStart(text: string, index: number): boolean {
  const previous = text[index - 1];
  const current = text[index];
  if (previous === undefined) return true;
  if (current === undefined) return false;
  return (
    (!ALNUM.test(previous) && ALNUM.test(current)) ||
    (LOWER.test(previous) && UPPER.test(current))
  );
}

/** The shortest stretch of `text` that holds `token` in order, or null. */
function tightestSpan(token: string, text: string): number | null {
  let best: number | null = null;
  for (let start = text.indexOf(token.charAt(0)); start !== -1;) {
    let cursor = start;
    for (const char of token.slice(1)) {
      cursor = text.indexOf(char, cursor + 1);
      if (cursor === -1) return best;
    }
    const span = cursor - start + 1;
    if (best === null || span < best) best = span;
    start = text.indexOf(token.charAt(0), start + 1);
  }
  return best;
}

/** A tier and a tiebreak in [0, 1) that rewards tighter subsequences. */
function matchText(
  token: string,
  text: string,
  scattered: boolean,
): { tier: Tier; tightness: number } | null {
  const cased = strip(text);
  const folded = cased.toLowerCase();
  const boundaries = folded.length === cased.length ? cased : folded;
  if (folded.startsWith(token)) return { tier: PREFIX, tightness: 0 };
  for (
    let index = folded.indexOf(token, 1);
    index !== -1;
    index = folded.indexOf(token, index + 1)
  ) {
    if (isWordStart(boundaries, index)) return { tier: WORD, tightness: 0 };
  }
  const span = scattered
    ? tightestSpan(token, folded)
    : folded.includes(token)
      ? token.length
      : null;
  if (span === null) return null;
  return { tier: SUBSEQUENCE, tightness: (0.9 * token.length) / span };
}

function scoreToken(token: string, item: Searchable): number | null {
  const candidates: { text: string; field: number; scattered: boolean }[] = [
    { text: item.title, field: FIELD.title, scattered: true },
    ...item.keywords.map((text) => ({
      text,
      field: FIELD.keyword,
      scattered: true,
    })),
    { text: item.blurb, field: FIELD.blurb, scattered: false },
  ];
  let best: number | null = null;
  for (const { text, field, scattered } of candidates) {
    const match = matchText(token, text, scattered);
    if (match === null) continue;
    // A blurb that opens with the token counts as a word start, not a prefix.
    const tier =
      field === FIELD.blurb ? Math.min(match.tier, WORD) : match.tier;
    // Tier outranks field, and field outranks tightness.
    const value = tier * 3 + field + match.tightness;
    if (best === null || value > best) best = value;
  }
  return best;
}

/**
 * How well `query` matches `item`, higher is better, or null for no match.
 * Every whitespace-separated word of the query must match some field; per word,
 * a prefix beats a word start beats a subsequence, then title beats keyword beats blurb.
 */
export function score(query: string, item: Searchable): number | null {
  const tokens = strip(query).toLowerCase().split(/\s+/).filter(Boolean);
  let total = 0;
  for (const token of tokens) {
    const value = scoreToken(token, item);
    if (value === null) return null;
    total += value;
  }
  return total;
}

/** Matches of `query`, best first; ties and an empty query keep the given order. */
export function rank<T>(
  query: string,
  items: readonly T[],
  fields: (item: T) => Searchable,
): T[] {
  return items
    .flatMap((item) => {
      const value = score(query, fields(item));
      return value === null ? [] : [{ item, value }];
    })
    .sort((a, b) => b.value - a.value)
    .map(({ item }) => item);
}
