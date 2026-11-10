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

describe("Showcase.stills", () => {
  const LEAD = "640px";

  test("lists the lead at the given width, then the phone and TV at theirs", () => {
    const showcase = Showcase.of([desktop("/a.webp"), phoneVideo, tvVideo]);
    expect(showcase && Showcase.stills(showcase, LEAD)).toEqual([
      {
        src: "/a.webp",
        width: 1280,
        height: 800,
        sizes: LEAD,
        original: false,
      },
      {
        src: "/phone.webp",
        width: 1179,
        height: 2556,
        sizes: Showcase.SIZES.phone,
        original: false,
      },
      {
        src: "/tv.webp",
        width: 1280,
        height: 960,
        sizes: Showcase.SIZES.tv,
        original: false,
      },
    ]);
  });

  test("a lone phone has its own width, whatever the lead's", () => {
    const showcase = Showcase.of([phoneVideo]);
    expect(showcase && Showcase.stills(showcase, LEAD)).toEqual([
      {
        src: "/phone.webp",
        width: 1179,
        height: 2556,
        sizes: Showcase.SIZES.lone,
        original: false,
      },
    ]);
  });

  test("pixel art is served as the file itself", () => {
    const art: Media = {
      kind: "image",
      src: "/pixels.png",
      alt: "pixels",
      width: 640,
      height: 480,
      frame: "desktop",
      pixelated: true,
    };
    const showcase = Showcase.of([art]);
    expect(showcase && Showcase.stills(showcase, LEAD)).toEqual([
      {
        src: "/pixels.png",
        width: 640,
        height: 480,
        sizes: LEAD,
        original: true,
      },
    ]);
  });

  test("a board shows its poster", () => {
    const showcase = Showcase.of([board]);
    expect(showcase && Showcase.stills(showcase, LEAD)).toEqual([
      {
        src: "/board.webp",
        width: 2560,
        height: 1600,
        sizes: LEAD,
        original: false,
      },
    ]);
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

describe("Showcase.clock", () => {
  const desktopVideo: Media = {
    kind: "video",
    src: "/desktop.mp4",
    poster: "/desktop.webp",
    alt: "desktop",
    width: 1280,
    height: 800,
    frame: "desktop",
  };

  test("is the lead's video when the phone or TV plays beside it", () => {
    const showcase = Showcase.of([desktopVideo, phoneVideo, tvVideo]);
    expect(showcase && Showcase.clock(showcase)).toBe("/desktop.mp4");
  });

  test("is the phone's video when the lead is a still and the TV plays beside the phone", () => {
    const showcase = Showcase.of([desktop("/a.webp"), phoneVideo, tvVideo]);
    expect(showcase && Showcase.clock(showcase)).toBe("/phone.mp4");
  });

  test("is null when only one video plays", () => {
    const pairs = [
      Showcase.of([desktop("/a.webp"), phoneVideo]),
      Showcase.of([phoneVideo]),
      Showcase.of([desktopVideo]),
    ];
    for (const showcase of pairs)
      expect(showcase && Showcase.clock(showcase)).toBeNull();
  });
});

describe("Showcase TV framing", () => {
  test("frames a lone TV capture in its bezel, deeper at the bottom", () => {
    const showcase = Showcase.of([tvVideo]);
    expect(showcase && Showcase.aspect(showcase)).toBeCloseTo(
      1 /
        ((960 / 1280) * (1 - 2 * Showcase.TV_BEZEL) +
          Showcase.TV_BEZEL +
          Showcase.TV_CHIN),
    );
  });

  test("lifts a TV with a console just enough that the console covers only its chin", () => {
    const console = {
      src: "/console.webp",
      alt: "console",
      width: 720,
      height: 395,
    };
    const lift = Showcase.consoleLift(console);
    const consoleHeight = Showcase.CONSOLE * (395 / 720);
    const chin = Showcase.TV_CHIN * Showcase.TV_INSET;
    expect(lift).toBeGreaterThan(0);
    expect(consoleHeight - lift).toBeGreaterThan(0);
    expect(consoleHeight - lift).toBeLessThanOrEqual(chin);
  });
});
