import { ReactionField } from "./reaction-field";
import { whalePoints } from "./whale-shape";
import { WhaleSwim } from "./whale-swim";

const STEP = 1 / 60;
const pod = [
  { x: 460, y: 640, scale: 150, heading: 0, phase: 0, depth: 0.85 },
  { x: 750, y: 175, scale: 100, heading: Math.PI, phase: 2.4, depth: 0.65 },
];

/** A fixed 60 Hz step keeps the particle springs independent of display refresh. */
export class Whales {
  field = new ReactionField();
  accumulator = 0;
  swimmers = pod.map((spec) => new WhaleSwim(spec));
  points = this.swimmers.flatMap((swimmer, whale) =>
    whalePoints().map((p, id) => ({
      id,
      whale,
      swimmer,
      nx: p.x,
      ny: p.y,
      nz: p.z,
      part: p.part,
      edge: p.edge,
      ...swimmer.project(p.x, p.y, p.z, p.part),
      vx: 0,
      vy: 0,
    })),
  );

  step(dt: number) {
    this.accumulator += Math.min(dt, 0.1);
    while (this.accumulator + 1e-9 >= STEP) {
      this.accumulator -= STEP;
      for (const swimmer of this.swimmers) swimmer.step(STEP);
      this.field.step(4);
      for (const point of this.points) {
        const target = point.swimmer.project(
          point.nx,
          point.ny,
          point.nz,
          point.part,
        );
        point.vx = (point.vx + (target.x - point.x) * 0.035) * 0.82;
        point.vy = (point.vy + (target.y - point.y) * 0.035) * 0.82;
        point.x += point.vx;
        point.y += point.vy;
      }
    }
  }

  snapshot() {
    return this.points.map((point) => ({
      x: point.x - point.swimmer.frameOffsetX,
      y: point.y,
      vx: point.vx,
      vy: point.vy,
      edge: point.edge,
      pattern: Math.min(
        1,
        this.field.sample((point.nx + 1.2) / 2.2, (point.ny + 0.4) / 1.1) * 3,
      ),
      depth: point.swimmer.depth,
    }));
  }
}
export type WhalePoint = ReturnType<Whales["snapshot"]>[number];
