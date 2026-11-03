import { describe, expect, test } from "bun:test";
import type { Media } from "~/content/projects";
import { Showcase } from "./showcase";

const desktop = (src: string, width = 1280, height = 800): Media => ({
  kind: "image",
  src,
  alt: src,
  width,
  height,
  frame: "desktop",
});
const phoneVideo: Media = {
  kind: "video",
  src: "/phone.mp4",
  poster: "/phone.webp",
  alt: "phone",
  width: 1179,
  height: 2556,
  frame: "phone",
};

describe("Showcase.of", () => {
  test("leads with the first desktop capture and sets the first phone capture in front, even when the phone comes first", () => {
    const showcase = Showcase.of([
      phoneVideo,
      desktop("/a.webp"),
      desktop("/b.webp"),
    ]);
    expect(showcase).toEqual({
      kind: "desktop",
      lead: desktop("/a.webp"),
      phone: phoneVideo,
    });
  });

  test("shows a desktop capture alone when there is no phone capture", () => {
    expect(Showcase.of([desktop("/a.webp")])).toEqual({
      kind: "desktop",
      lead: desktop("/a.webp"),
      phone: null,
    });
  });

  test("shows a phone capture on its own when there is nothing else", () => {
    expect(Showcase.of([phoneVideo])).toEqual({
      kind: "phone",
      phone: phoneVideo,
    });
  });

  test("has nothing to show without captures", () => {
    expect(Showcase.of(undefined)).toBeNull();
    expect(Showcase.of([])).toBeNull();
  });
});

describe("Showcase.aspect", () => {
  test("is the lead's own shape when it stands alone", () => {
    const showcase = Showcase.of([desktop("/a.webp", 1600, 1000)]);
    expect(showcase && Showcase.aspect(showcase)).toBeCloseTo(1.6);
  });

  test("leaves room under the lead for the phone's overhang", () => {
    const showcase = Showcase.of([desktop("/a.webp", 1600, 1000), phoneVideo]);
    expect(showcase && Showcase.aspect(showcase)).toBeCloseTo(
      1 / (1000 / 1600 + Showcase.OVERHANG),
    );
  });
});
