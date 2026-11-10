import { rasterAt, type RouteFrame, valueAt } from "./route";
import { bayerIndex } from "./texture";
import {
  type Current,
  VERTEX_FLOATS,
  WHALE_INDICES,
  WHALE_VERTICES,
  type WhalePose,
  writeWhale,
} from "./whale-body";

/**
 * A mother and calf swimming in place, printed as a strip of frames: the
 * painting's whales, for anywhere the painting itself is not drawn. One loop
 * is one of the mother's strokes and two of the calf's, so the last frame
 * meets the first.
 */
export type WhaleSprite = {
  /**
   * Print level 0..3 of each cell, frames side by side and rows top to
   * bottom: 0 is empty, and 1..3 run from a belly to a lit back.
   */
  levels: Uint8Array;
};

const FRAMES = 32;
/** The mother's body length, in cells. */
const LENGTH = 56;
/** The calf, in the mother's body lengths: tucked under her, behind her fin. */
const CALF = { length: 0.565, behind: 0.6, below: 0.44, phase: 2.6 } as const;
const MARGIN = 2;
/** A whale's reach above its spine (a raised fluke) and behind its nose, in its body lengths. */
const RISE = 0.24,
  REACH = 1.1;
/** The calf's reach below its spine: its near fin. */
const DEPTH = 0.36;
const WIDTH = Math.ceil(
  MARGIN * 2 + (CALF.behind + CALF.length * REACH) * LENGTH,
);
const HEIGHT = Math.ceil(
  MARGIN * 2 + (RISE + CALF.below + CALF.length * DEPTH) * LENGTH,
);
const NOSE = WIDTH - MARGIN - 0.5,
  SPINE = MARGIN + RISE * LENGTH;

/** Still air: a level centerline heading right, bellies down. */
const AIR: Current = {
  centerline(s: number, _time: number, out: RouteFrame) {
    out.x = s;
    out.y = SPINE;
    out.tx = 1;
    out.ty = 0;
    out.nx = 0;
    out.ny = 1;
    return out;
  },
};

/** Ink for levels 1..3 over the frame's dark ground. */
const INKS = [
  [22, 52, 62],
  [40, 92, 108],
  [84, 156, 172],
] as const;

const EMPTY = -1;

/** Fills one triangle's cells with its shade, interpolated at each cell's centre. */
function fill(
  tone: Float32Array,
  vertices: Float32Array,
  a: number,
  b: number,
  c: number,
) {
  const ax = valueAt(vertices, a * VERTEX_FLOATS),
    ay = valueAt(vertices, a * VERTEX_FLOATS + 1),
    bx = valueAt(vertices, b * VERTEX_FLOATS),
    by = valueAt(vertices, b * VERTEX_FLOATS + 1),
    cx = valueAt(vertices, c * VERTEX_FLOATS),
    cy = valueAt(vertices, c * VERTEX_FLOATS + 1);
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (area === 0) return;
  const shadeA = valueAt(vertices, a * VERTEX_FLOATS + 2),
    shadeB = valueAt(vertices, b * VERTEX_FLOATS + 2),
    shadeC = valueAt(vertices, c * VERTEX_FLOATS + 2);
  const left = Math.max(0, Math.floor(Math.min(ax, bx, cx))),
    right = Math.min(WIDTH - 1, Math.ceil(Math.max(ax, bx, cx))),
    top = Math.max(0, Math.floor(Math.min(ay, by, cy))),
    bottom = Math.min(HEIGHT - 1, Math.ceil(Math.max(ay, by, cy)));
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++) {
      const px = x + 0.5,
        py = y + 0.5;
      const wa = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area,
        wb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area,
        wc = 1 - wa - wb;
      if (wa < 0 || wb < 0 || wc < 0) continue;
      tone[y * WIDTH + x] = wa * shadeA + wb * shadeB + wc * shadeC;
    }
}

function render(): WhaleSprite {
  const levels = new Uint8Array(WIDTH * FRAMES * HEIGHT);
  const vertices = new Float32Array(2 * WHALE_VERTICES * VERTEX_FLOATS);
  const tone = new Float32Array(WIDTH * HEIGHT);
  const mother: WhalePose = {
    s: NOSE,
    lane: 0,
    phase: 0,
    length: LENGTH,
    bend: 0,
  };
  const calf: WhalePose = {
    s: NOSE - CALF.behind * LENGTH,
    lane: CALF.below * LENGTH,
    phase: 0,
    length: CALF.length * LENGTH,
    bend: 0,
  };
  for (let frame = 0; frame < FRAMES; frame++) {
    mother.phase = (2 * Math.PI * frame) / FRAMES;
    calf.phase = 2 * mother.phase + CALF.phase;
    // The calf first: where they overlap, the mother is nearer.
    writeWhale(calf, AIR, 0, vertices, 0);
    writeWhale(mother, AIR, 0, vertices, WHALE_VERTICES);
    tone.fill(EMPTY);
    for (const first of [0, WHALE_VERTICES])
      for (let i = 0; i < WHALE_INDICES.length; i += 3)
        fill(
          tone,
          vertices,
          first + rasterAt(WHALE_INDICES, i),
          first + rasterAt(WHALE_INDICES, i + 1),
          first + rasterAt(WHALE_INDICES, i + 2),
        );
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const shade = valueAt(tone, y * WIDTH + x);
        if (shade === EMPTY) continue;
        const threshold = (bayerIndex(x, y) + 0.5) / 16;
        levels[y * WIDTH * FRAMES + frame * WIDTH + x] =
          1 + Math.min(2, Math.floor(shade * 2 + threshold));
      }
  }
  return { levels };
}

/** The strip as RGBA: ink on the cells that hold a whale, the rest clear. */
function pixels({ levels }: WhaleSprite) {
  const rgba = new Uint8ClampedArray(levels.length * 4);
  for (let i = 0; i < levels.length; i++) {
    const ink = INKS[rasterAt(levels, i) - 1];
    if (ink === undefined) continue;
    rgba[i * 4] = ink[0];
    rgba[i * 4 + 1] = ink[1];
    rgba[i * 4 + 2] = ink[2];
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

export const WhaleSprite = {
  FRAMES,
  /** One frame's size, in cells. */
  WIDTH,
  HEIGHT,
  render,
  pixels,
} as const;
