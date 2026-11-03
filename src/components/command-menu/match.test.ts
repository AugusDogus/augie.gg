import { describe, expect, test } from "bun:test";
import { plainText, rank, score, type Searchable } from "./match";

const entry = (title: string, blurb = "", keywords: string[] = []) => ({
  title,
  blurb,
  keywords,
});
const titles = (query: string, list: Searchable[]) =>
  rank(query, list, (item) => item).map((item) => item.title);

describe("score", () => {
  test("ignores case and accents", () => {
    expect(score("RESUME", entry("Open résumé"))).not.toBeNull();
    expect(score("Junk", entry("junkyardindex.com"))).not.toBeNull();
  });

  test("ranks a prefix over a word start over a subsequence", () => {
    const prefix = score("dash", entry("DashSplit"));
    const word = score("split", entry("DashSplit"));
    const subsequence = score("dsp", entry("DashSplit"));
    expect(prefix).not.toBeNull();
    expect(word).not.toBeNull();
    expect(subsequence).not.toBeNull();
    expect(prefix ?? 0).toBeGreaterThan(word ?? 0);
    expect(word ?? 0).toBeGreaterThan(subsequence ?? 0);
  });

  test("starts words after punctuation and at camel case humps", () => {
    const word = score("t3code", entry("pingdotgg/t3code"));
    const camel = score("split", entry("DashSplit"));
    expect(word ?? 0).toBeGreaterThan(
      score("3code", entry("pingdotgg/t3code")) ?? 0,
    );
    expect(camel ?? 0).toBeGreaterThan(score("plit", entry("DashSplit")) ?? 0);
  });

  test("prefers a tighter subsequence", () => {
    const tight = score("dex", entry("junkyardindex.com"));
    const loose = score("dex", entry("discord.mov extra"));
    expect(loose).not.toBeNull();
    expect(tight ?? 0).toBeGreaterThan(loose ?? 0);
  });

  test("matches keywords like titles but ranks them below the title", () => {
    const keyword = score("contact", entry("Copy email", "", ["contact"]));
    const title = score("contact", entry("contact"));
    expect(score("contact", entry("Copy email"))).toBeNull();
    expect(keyword).not.toBeNull();
    expect(title ?? 0).toBeGreaterThan(keyword ?? 0);
  });

  test("matches blurbs by word start or substring, never by scattered letters", () => {
    const blurb = "A native Linux Microsoft Teams client, written in Rust.";
    expect(score("rust", entry("teams-rs", blurb))).not.toBeNull();
    expect(score("soft", entry("teams-rs", blurb))).not.toBeNull();
    expect(score("nlm", entry("teams-rs", blurb))).toBeNull();
  });

  test("ranks a title match over a blurb match of the same kind", () => {
    const title = score("game", entry("Valheim game", "Something else."));
    const blurb = score("game", entry("pact", "A Unity game."));
    expect(title ?? 0).toBeGreaterThan(blurb ?? 0);
  });

  test("requires every word of the query to match somewhere", () => {
    const item = entry("teams-rs", "A native Linux Microsoft Teams client.");
    expect(score("teams linux", item)).not.toBeNull();
    expect(score("teams windows", item)).toBeNull();
  });

  test("returns null when nothing matches", () => {
    expect(score("zzqx", entry("multiplex", "Watch Plex with friends."))).toBe(
      null,
    );
  });
});

describe("rank", () => {
  const list = [
    entry("multiplex", "Watch Plex with friends in perfect sync."),
    entry("Open GitHub", "", ["github", "profile"]),
    entry("plex-rich-presence-cli", "Publishes what you watch to Discord."),
    entry("Re-Spite-Proxy", "A TCP proxy for intercepting packets."),
  ];

  test("keeps every item in order for an empty query", () => {
    expect(titles("  ", list)).toEqual(list.map((item) => item.title));
  });

  test("orders matches by score and drops the rest", () => {
    expect(titles("plex", list)).toEqual([
      "plex-rich-presence-cli",
      "multiplex",
    ]);
  });

  test("ranks across titles, keywords, and blurbs", () => {
    expect(titles("p", list)).toEqual([
      "plex-rich-presence-cli",
      "Open GitHub",
      "Re-Spite-Proxy",
      "multiplex",
    ]);
  });

  test("keeps file order between equal matches", () => {
    expect(titles("a", [entry("atlas"), entry("alpha"), entry("arc")])).toEqual(
      ["atlas", "alpha", "arc"],
    );
  });
});

describe("plainText", () => {
  test("keeps link text and drops the url", () => {
    expect(
      plainText(
        "Mods, including [Buildheim](https://github.com/AugusDogus/Buildheim) and [Soundheim](https://x.y/z).",
      ),
    ).toBe("Mods, including Buildheim and Soundheim.");
  });
});
