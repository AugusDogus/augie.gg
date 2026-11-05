import { describe, expect, test } from "bun:test";
import { Blurb } from "./blurb";

describe("Blurb", () => {
  test("keeps plain text as one segment", () => {
    expect(Blurb.parse("A mod manager for Deadlock.")).toEqual([
      { kind: "text", text: "A mod manager for Deadlock." },
    ]);
  });

  test("splits inline links out of the text", () => {
    expect(
      Blurb.parse("Fixed it ([#83](https://example.com/83)) and more."),
    ).toEqual([
      { kind: "text", text: "Fixed it (" },
      { kind: "link", text: "#83", href: "https://example.com/83" },
      { kind: "text", text: ") and more." },
    ]);
  });

  test("drops empty text between adjacent links", () => {
    expect(Blurb.parse("[a](https://a.dev)[b](https://b.dev)")).toEqual([
      { kind: "link", text: "a", href: "https://a.dev" },
      { kind: "link", text: "b", href: "https://b.dev" },
    ]);
  });

  test("plain text keeps link labels and drops urls", () => {
    expect(
      Blurb.plain(
        "Seven mods, including [Buildheim](https://github.com/AugusDogus/Buildheim).",
      ),
    ).toBe("Seven mods, including Buildheim.");
  });
});
