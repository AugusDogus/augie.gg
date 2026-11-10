import { type RouteFrame, valueAt } from "./route";
import type { Stream } from "./streams";

export const SPINE_NODES = 30,
  WHALE_VERTICES = 106,
  VERTEX_FLOATS = 4;
/** Spine extent and body wave wavelength, in body lengths from the rostrum. */
export const SPINE_LENGTH = 0.92;
const WAVELENGTH = 1.1;
const RIGID = 0.45;
/** Phase lag of the body wave at the fluke root. */
export const ROOT_LAG = (2 * Math.PI * SPINE_LENGTH) / WAVELENGTH;

/** Vertex index of spine node i; its dorsal and ventral edges are the neighbours. */
export const spineVertex = (node: number) => node * 3 + 1;
/** Vertex groups, in index order. */
const BODY = 0,
  FAR_FIN = SPINE_NODES * 3,
  FLUKES = FAR_FIN + 4,
  HUMP = FLUKES + 5,
  NEAR_FIN = HUMP + 3;
const FIN_NODE = 9,
  HUMP_NODE = 20;
const SHADE = {
  dorsal: 1,
  spine: 0.45,
  ventral: 0,
  nearFin: 0.2,
  farFin: 0.05,
  flukes: 0.7,
} as const;
/** Rigid fluke crescent as (back, ventral) body lengths from the root: root, upper tip, notch, lower tip, root. */
const FLUKE = [0, -0.025, 0.16, -0.1, 0.07, 0, 0.15, 0.09, 0, 0.025];

/** What a whale's body reads from its current: the centerline it follows. */
export type Current = Pick<Stream, "centerline">;

export type WhalePose = {
  /** Nose arc along the stream route. */
  s: number;
  /** Offset from the centerline in px; positive is ventral. */
  lane: number;
  phase: number;
  /** Body length L in px. */
  length: number;
  /** Rostrum offset in px, positive ventral; it fades to 0 at the fluke root. */
  bend: number;
};

export function dorsalRadius(x: number) {
  if (x < 0.32) return 0.118 * Math.sqrt(Math.max(0, x) / 0.32);
  return 0.118 * Math.max(0.3, Math.max(0, 1 - (x - 0.32) / 0.6) ** 1.1);
}

/** Deeper than the back along the humpback throat. */
export function ventralRadius(x: number) {
  return dorsalRadius(x) * (x < 0.5 ? 1.22 - 0.44 * x : 1);
}

const envelope = (x: number) => ((x - RIGID) / (SPINE_LENGTH - RIGID)) ** 2;

/** Travelling body wave in body lengths. The front 45% is exactly rigid. */
export function heave(x: number, phase: number) {
  if (x <= RIGID) return 0;
  return 0.075 * envelope(x) * Math.sin(phase - (2 * Math.PI * x) / WAVELENGTH);
}

function heaveSlope(x: number, phase: number) {
  if (x <= RIGID) return 0;
  const k = (2 * Math.PI) / WAVELENGTH,
    angle = phase - k * x;
  const rise = (2 * (x - RIGID)) / (SPINE_LENGTH - RIGID) ** 2;
  return 0.075 * (rise * Math.sin(angle) - envelope(x) * k * Math.cos(angle));
}

/** Fluke pitch toward dorsal, leading the root heave by a quarter cycle. */
export function flukePitch(phase: number) {
  return 0.35 * Math.cos(phase - ROOT_LAG);
}

export function finSweep(phase: number) {
  return 0.72 + 0.08 * Math.sin(phase + 0.9);
}

function buildIndices() {
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) =>
    indices.push(a, b, c, a, c, d);
  quad(FAR_FIN, FAR_FIN + 1, FAR_FIN + 2, FAR_FIN + 3);
  for (let i = 0; i < SPINE_NODES - 1; i++) {
    const a = BODY + i * 3,
      b = a + 3;
    quad(a, b, b + 1, a + 1);
    quad(a + 1, b + 1, b + 2, a + 2);
  }
  indices.push(FLUKES, FLUKES + 1, FLUKES + 2);
  indices.push(FLUKES, FLUKES + 2, FLUKES + 4);
  indices.push(FLUKES + 4, FLUKES + 2, FLUKES + 3);
  indices.push(HUMP, HUMP + 1, HUMP + 2);
  quad(NEAR_FIN, NEAR_FIN + 1, NEAR_FIN + 2, NEAR_FIN + 3);
  return Uint16Array.from(indices);
}

/** One whale's triangles, drawn far fin → body → flukes → hump → near fin. */
export const WHALE_INDICES = buildIndices();

const row = (offset: number, nodes: readonly number[]) =>
  nodes.map((i) => BODY + i * 3 + offset);
const range = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) =>
    from < to ? from + i : from - i,
  );
/** Closed polygons for the 2D fallback, in fill order: far fin, body with hump and flukes, near fin. */
export const WHALE_OUTLINES: readonly Uint16Array[] = [
  Uint16Array.of(FAR_FIN, FAR_FIN + 1, FAR_FIN + 2, FAR_FIN + 3),
  Uint16Array.from([
    ...row(0, range(0, HUMP_NODE - 1)),
    HUMP + 1,
    ...row(0, range(HUMP_NODE + 1, SPINE_NODES - 1)),
    FLUKES + 1,
    FLUKES + 2,
    FLUKES + 3,
    ...row(2, range(SPINE_NODES - 1, 0)),
  ]),
  Uint16Array.of(NEAR_FIN, NEAR_FIN + 1, NEAR_FIN + 2, NEAR_FIN + 3),
];

/** Spine node in P px, with the route tangent and the bent body's ventral normal. */
type Node = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  /** Ventral body normal. */
  bx: number;
  by: number;
  arc: number;
};
const route: RouteFrame = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
const node: Node = { x: 0, y: 0, tx: 0, ty: 0, bx: 0, by: 0, arc: 0 };

function place(
  pose: WhalePose,
  stream: Current,
  time: number,
  i: number,
): Node {
  const x = (SPINE_LENGTH * i) / (SPINE_NODES - 1);
  node.arc = pose.s - x * pose.length;
  stream.centerline(node.arc, time, route);
  const along = 1 - x / SPINE_LENGTH;
  const offset =
    pose.lane + heave(x, pose.phase) * pose.length + pose.bend * along * along;
  const slope =
    heaveSlope(x, pose.phase) -
    (2 * pose.bend * along) / (SPINE_LENGTH * pose.length);
  const bx = route.nx + slope * route.tx,
    by = route.ny + slope * route.ty,
    size = Math.sqrt(bx * bx + by * by);
  node.x = route.x + route.nx * offset;
  node.y = route.y + route.ny * offset;
  node.tx = route.tx;
  node.ty = route.ty;
  node.bx = bx / size;
  node.by = by / size;
  return node;
}

function put(
  out: Float32Array,
  first: number,
  vertex: number,
  x: number,
  y: number,
  shade: number,
) {
  const offset = (first + vertex) * VERTEX_FLOATS;
  out[offset] = x;
  out[offset + 1] = y;
  out[offset + 2] = shade;
  // Route arc of the vertex: its node's arc plus its offset along the tangent.
  out[offset + 3] = node.arc + (x - node.x) * node.tx + (y - node.y) * node.ty;
}

type Fin = {
  vertex: number;
  /** Root depth below the spine, as a fraction of the ventral radius. */
  depth: number;
  reach: number;
  rootChord: number;
  tipChord: number;
  shade: number;
};
const FAR_FLIPPER: Fin = {
  vertex: FAR_FIN,
  depth: 0.3,
  reach: 0.2,
  rootChord: 0.05,
  tipChord: 0.012,
  shade: SHADE.farFin,
};
const NEAR_FLIPPER: Fin = {
  vertex: NEAR_FIN,
  depth: 1,
  reach: 0.32,
  rootChord: 0.09,
  tipChord: 0.025,
  shade: SHADE.nearFin,
};
const FAR_FIN_ANGLE = 0.25;

function writeFin(
  fin: Fin,
  angle: number,
  pose: WhalePose,
  stream: Current,
  time: number,
  out: Float32Array,
  first: number,
) {
  const L = pose.length;
  const { x, y, tx, ty, bx, by } = place(pose, stream, time, FIN_NODE);
  const depth =
    fin.depth * ventralRadius((SPINE_LENGTH * FIN_NODE) / (SPINE_NODES - 1));
  const rootX = x + bx * depth * L,
    rootY = y + by * depth * L;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  // The blade runs back and down; the chord's leading side faces forward and down.
  const dx = -tx * cos + bx * sin,
    dy = -ty * cos + by * sin;
  const cx = tx * sin + bx * cos,
    cy = ty * sin + by * cos;
  const tipX = rootX + dx * fin.reach * L,
    tipY = rootY + dy * fin.reach * L;
  const root = (fin.rootChord * L) / 2,
    tip = (fin.tipChord * L) / 2;
  const v = fin.vertex;
  put(out, first, v, rootX + cx * root, rootY + cy * root, fin.shade);
  put(out, first, v + 1, tipX + cx * tip, tipY + cy * tip, fin.shade);
  put(out, first, v + 2, tipX - cx * tip, tipY - cy * tip, fin.shade);
  put(out, first, v + 3, rootX - cx * root, rootY - cy * root, fin.shade);
}

/** Writes one whale's WHALE_VERTICES × (x, y, shade, arc) starting at vertex `first`. Allocation-free. */
export function writeWhale(
  pose: WhalePose,
  stream: Current,
  time: number,
  out: Float32Array,
  first: number,
) {
  const L = pose.length;
  writeFin(FAR_FLIPPER, FAR_FIN_ANGLE, pose, stream, time, out, first);
  for (let i = 0; i < SPINE_NODES; i++) {
    const { x, y, bx, by } = place(pose, stream, time, i);
    const position = (SPINE_LENGTH * i) / (SPINE_NODES - 1);
    const up = dorsalRadius(position) * L,
      down = ventralRadius(position) * L;
    const v = BODY + i * 3;
    put(out, first, v, x - bx * up, y - by * up, SHADE.dorsal);
    put(out, first, v + 1, x, y, SHADE.spine);
    put(out, first, v + 2, x + bx * down, y + by * down, SHADE.ventral);
    if (i === HUMP_NODE - 1 || i === HUMP_NODE + 1)
      put(
        out,
        first,
        HUMP + i - HUMP_NODE + 1,
        x - bx * up,
        y - by * up,
        SHADE.dorsal,
      );
    if (i === HUMP_NODE) {
      const lift = up + 0.028 * L;
      put(out, first, HUMP + 1, x - bx * lift, y - by * lift, SHADE.dorsal);
    }
  }

  const { x, y, bx, by } = place(pose, stream, time, SPINE_NODES - 1);
  const pitch = flukePitch(pose.phase);
  const cos = Math.cos(pitch),
    sin = Math.sin(pitch);
  // The rearward body tangent (−by, bx) and ventral normal, pitched toward dorsal.
  const backX = -by * cos - bx * sin,
    backY = bx * cos - by * sin;
  const downX = bx * cos - by * sin,
    downY = by * cos + bx * sin;
  for (let k = 0; k < FLUKE.length / 2; k++) {
    const back = valueAt(FLUKE, k * 2) * L,
      down = valueAt(FLUKE, k * 2 + 1) * L;
    put(
      out,
      first,
      FLUKES + k,
      x + backX * back + downX * down,
      y + backY * back + downY * down,
      SHADE.flukes,
    );
  }

  writeFin(NEAR_FLIPPER, finSweep(pose.phase), pose, stream, time, out, first);
}
