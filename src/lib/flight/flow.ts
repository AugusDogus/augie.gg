export type Pointer = { x: number; y: number; active: boolean };
type Brush = { x: number; y: number; dx: number; dy: number };
export type FlowState = { brushes: Brush[] };
const WIDTH = 1200;
const HEIGHT = 874;
export const BRUSH_RADIUS = 55;
export const MAX_PUSH = 16;

/** A directional brush with a fading trail. It never generates radial waves. */
export class Flow {
  brushes: Brush[] = [];
  previous: Pick<Pointer, "x" | "y"> | null = null;

  step(dt: number, pointer: Pointer) {
    if (dt <= 0) return;
    const decay = Math.exp(-dt * 4);
    this.brushes = this.brushes
      .map((brush) => ({
        ...brush,
        dx: brush.dx * decay,
        dy: brush.dy * decay,
      }))
      .filter((brush) => Math.hypot(brush.dx, brush.dy) > 0.08);
    if (!pointer.active) {
      this.previous = null;
      return;
    }
    if (this.previous) {
      const dx = (pointer.x - this.previous.x) * WIDTH;
      const dy = (pointer.y - this.previous.y) * HEIGHT;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.5) {
        const push = Math.min(MAX_PUSH, (distance / dt) * 0.025);
        this.brushes.push({
          x: pointer.x,
          y: pointer.y,
          dx: (dx / distance) * push,
          dy: (dy / distance) * push,
        });
        this.brushes = this.brushes.slice(-8);
      }
    }
    this.previous = { x: pointer.x, y: pointer.y };
  }

  snapshot() {
    return { brushes: this.brushes.map((brush) => ({ ...brush })) };
  }
}

/** Compact texture brush. Its influence is exactly zero beyond the radius. */
export function brushAt(state: FlowState, x: number, y: number) {
  let dx = 0,
    dy = 0,
    weight = 0;
  for (const brush of state.brushes) {
    const distance = Math.hypot(x - brush.x * WIDTH, y - brush.y * HEIGHT);
    const influence = Math.max(0, 1 - (distance / BRUSH_RADIUS) ** 2) ** 2;
    dx += brush.dx * influence;
    dy += brush.dy * influence;
    weight += influence;
  }
  return { x: dx / Math.max(1, weight), y: dy / Math.max(1, weight) };
}
