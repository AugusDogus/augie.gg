import type { Pointer } from "./flow";
type SpeckBase = {
  id: number;
  x: number;
  y: number;
  depth: number;
  life: number;
};
type Speck = SpeckBase &
  ({ trail: false } | { trail: true; vx: number; vy: number });
const wrap = (value: number, size: number) => ((value % size) + size) % size;

/** Dust-like marks with independent depth and inertia, without animal silhouettes. */
export class Specks {
  nextId = 300;
  pointer: Pick<Pointer, "x" | "y"> | null = null;
  emission = 0;
  points: Speck[] = Array.from({ length: 300 }, (_, id) => {
    const depth = 0.15 + ((id * 0.6180339) % 1) * 0.85;
    return {
      id,
      x: (id * 761.7) % 1200,
      y: (id * 397.3) % 874,
      depth,
      life: 1,
      trail: false,
    };
  });

  step(dt: number, time: number, pointer?: Pointer) {
    for (const point of this.points) {
      const driftX =
        10 + point.depth * 16 + Math.sin(time * 0.55 + point.id) * 7;
      const driftY = -3 + Math.cos(time * 0.45 + point.id * 0.7) * 9;
      point.x = wrap(
        point.x + (driftX + (point.trail ? point.vx : 0)) * dt,
        1200,
      );
      point.y = wrap(
        point.y + (driftY + (point.trail ? point.vy : 0)) * dt,
        874,
      );
      if (point.trail) point.life -= dt * 1.8;
    }
    this.points = this.points.filter((point) => !point.trail || point.life > 0);
    if (!pointer?.active) {
      this.pointer = null;
      return;
    }
    if (this.pointer) {
      const dx = (pointer.x - this.pointer.x) * 1200;
      const dy = (pointer.y - this.pointer.y) * 874;
      const distance = Math.hypot(dx, dy);
      if (distance > 3) {
        this.emission += distance * 0.055;
        while (this.emission >= 1) {
          this.emission -= 1;
          // Deterministic randomness keeps exports and tests reproducible.
          const random =
            (Math.sin(this.nextId * 12.9898 + time * 78.233) * 43758.5453) % 1;
          if (Math.abs(random) < 0.42) this.spawn(pointer, dx, dy, time);
        }
      }
    }
    this.pointer = { x: pointer.x, y: pointer.y };
  }

  spawn(pointer: Pointer, dx: number, dy: number, time: number) {
    if (this.points.length >= 380) return;
    const id = this.nextId++;
    const depth = 0.35 + ((id * 0.6180339) % 1) * 0.65;
    const random = (Math.sin(id * 39.17 + time * 9.1) * 43758.5453) % 1;
    this.points.push({
      id,
      x: pointer.x * 1200 - dx * 0.1 + random * 5,
      y: pointer.y * 874 - dy * 0.1 - random * 5,
      depth,
      life: 0.8 + Math.abs(random) * 0.45,
      trail: true,
      vx: -dx * (0.7 + depth * 0.5),
      vy: -dy * (0.7 + depth * 0.5),
    });
  }

  snapshot() {
    return this.points.map((point) => ({ ...point }));
  }
}

export function drawSpecks(
  context: CanvasRenderingContext2D,
  points: readonly Speck[],
) {
  context.save();
  for (const point of points) {
    const size = (0.9 + point.depth ** 2 * 3) * (point.trail ? 0.8 : 1);
    context.globalAlpha =
      (0.28 + point.depth * 0.5) * (point.trail ? point.life : 1);
    context.fillStyle = point.id % 5 ? "#e0fff1" : "#90dce9";
    if (point.id % 4 === 0) {
      context.fillRect(point.x - size, point.y, size * 2, 0.85);
      context.fillRect(point.x, point.y - size, 0.85, size * 2);
    } else {
      context.fillRect(point.x, point.y, size, size * 0.75);
    }
  }
  context.restore();
}
