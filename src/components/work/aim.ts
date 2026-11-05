export type Point = { x: number; y: number };

/** The edge a pointer heads for: a box's left side, from top to bottom. */
export type Edge = { left: number; top: number; bottom: number };

/** Which side of the line from `a` to `b` the point lies on. */
function side(point: Point, a: Point, b: Point): number {
  return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
}

/** How far behind the pointer the triangle starts, so a move straight across counts. */
const SLACK = 4;

/**
 * Whether a pointer that left a row at `origin` and is now at `point` is still
 * heading for a box to the right, like the stage: inside the triangle from
 * the origin to the box's left edge. Crossing other rows on that path should
 * not swap what the box shows.
 */
export const Aim = {
  toward(origin: Point, edge: Edge, point: Point): boolean {
    const apex = { x: origin.x - SLACK, y: origin.y };
    const top = { x: edge.left, y: edge.top };
    const bottom = { x: edge.left, y: edge.bottom };
    const a = side(point, apex, top);
    const b = side(point, top, bottom);
    const c = side(point, bottom, apex);
    const negative = a < 0 || b < 0 || c < 0;
    const positive = a > 0 || b > 0 || c > 0;
    return !(negative && positive);
  },
} as const;
