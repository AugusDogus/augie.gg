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
const tvVideo: Media = {
  kind: "video",
  src: "/tv.mp4",
  poster: "/tv.webp",
  alt: "tv",
  width: 1280,
  height: 960,
  frame: "tv",
};
const board: Media = {
  kind: "board",
  poster: "/board.webp",
  alt: "board",
  width: 2560,
  height: 1600,
  pcb: "/board.kicad_pcb",
  schematic: "/board.kicad_sch",
  model: "/board.glb",
  note: "Draft",
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
      tv: null,
    });
  });

  test("shows a desktop capture alone when there is no phone capture", () => {
    expect(Showcase.of([desktop("/a.webp")])).toEqual({
      kind: "desktop",
      lead: desktop("/a.webp"),
      phone: null,
      tv: null,
    });
  });

  test("sets the first TV capture in front of a desktop lead, beside the phone", () => {
    expect(Showcase.of([tvVideo, desktop("/a.webp"), phoneVideo])).toEqual({
      kind: "desktop",
      lead: desktop("/a.webp"),
      phone: phoneVideo,
      tv: tvVideo,
    });
  });

  test("leads with a TV capture when there is no desktop capture", () => {
    expect(Showcase.of([phoneVideo, tvVideo])).toEqual({
      kind: "desktop",
      lead: tvVideo,
      phone: phoneVideo,
      tv: null,
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

  test("leads with a board as it would a desktop capture, the first of them", () => {
    expect(Showcase.of([board, desktop("/a.webp")])).toMatchObject({
      kind: "desktop",
      lead: board,
    });
    expect(Showcase.of([desktop("/a.webp"), board])).toMatchObject({
      kind: "desktop",
      lead: desktop("/a.webp"),
    });
  });

  test("shows a board alone, since a phone or TV in front would cover its viewer", () => {
    expect(Showcase.of([phoneVideo, board, tvVideo])).toEqual({
      kind: "desktop",
      lead: board,
      phone: null,
      tv: null,
    });
  });
});

describe("Showcase.cover", () => {
  test("crops an image itself", () => {
    const showcase = Showcase.of([desktop("/a.webp", 1600, 1000)]);
    expect(showcase && Showcase.cover(showcase)).toEqual({
      src: "/a.webp",
      width: 1600,
      height: 1000,
    });
  });

  test("crops a video's poster", () => {
    const showcase = Showcase.of([phoneVideo]);
    expect(showcase && Showcase.cover(showcase)).toEqual({
      src: "/phone.webp",
      width: 1179,
      height: 2556,
    });
  });

  test("crops a board's poster, never its viewer", () => {
    const showcase = Showcase.of([board]);
    expect(showcase && Showcase.cover(showcase)).toEqual({
      src: "/board.webp",
      width: 2560,
      height: 1600,
    });
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

  test("is a board's own shape, with no room for an overhang", () => {
    const showcase = Showcase.of([board, phoneVideo]);
    expect(showcase && Showcase.aspect(showcase)).toBeCloseTo(1.6);
  });

  test("leaves the same room for a TV capture's overhang without a phone", () => {
    const showcase = Showcase.of([desktop("/a.webp", 1600, 1000), tvVideo]);
    expect(showcase && Showcase.aspect(showcase)).toBeCloseTo(
      1 / (1000 / 1600 + Showcase.OVERHANG),
    );
  });
});
