const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const DEPTH_PROJECTION = 0.45;

/** Long crossings with shallow vertical passages and dorsoventral tail strokes. */
export type WhaleSpec = {
  x: number;
  y: number;
  heading: number;
  scale: number;
  phase: number;
  depth: number;
};
export class WhaleSwim {
  heading: number;
  scale: number;
  phase: number;
  seed: number;
  depth: number;
  length: number;
  cruiseSpeed: number;
  speed: number;
  distance: number;
  baseY: number;
  pitch: number;
  head: { x: number; y: number };
  constructor({ x, y, heading, scale, phase, depth }: WhaleSpec) {
    this.heading = heading;
    this.scale = scale;
    this.phase = phase;
    this.seed = phase;
    this.depth = depth;
    this.length = scale * 2.2;
    this.cruiseSpeed = (35 + this.length * 0.035) * 0.7;
    this.speed = this.cruiseSpeed;
    this.distance = 0;
    this.baseY = y;
    this.pitch = Math.atan((55 / 700) * Math.cos(this.seed));
    this.head = { x, y };
  }

  get frameOffsetX() {
    // Wrap only the rendered position. Physics stays continuous, so the
    // spring particles never chase a target across the entire artwork.
    // Only the trailing side needs a body-length allowance. One second of
    // padding at each edge leaves about two seconds between appearances.
    const padding = this.cruiseSpeed;
    const leftMargin = padding + (Math.cos(this.heading) < 0 ? this.length : 0);
    const span = 1200 + this.length + padding * 2;
    return Math.floor((this.head.x + leftMargin) / span) * span;
  }

  step(dt: number) {
    // Both half-strokes produce thrust, strongest through mid-stroke.
    // Drag smooths the pulses into a modest surge followed by a glide.
    const thrust = Math.cos(this.phase) ** 2;
    const targetSpeed = this.cruiseSpeed * (0.88 + thrust * 0.24);
    this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-dt / 0.9));
    this.phase += dt * (0.8 + this.speed / 80);
    const travel = this.speed * dt;
    this.distance += travel;
    this.head.x += Math.cos(this.heading) * travel;

    // The route bends over hundreds of pixels, not once per tail beat.
    // Its tangent sets the body pitch, tying ascent/descent to forward travel.
    const passage = this.seed + this.distance / 700;
    this.head.y = this.baseY + 55 * (Math.sin(passage) - Math.sin(this.seed));
    this.pitch = Math.atan((55 / 700) * Math.cos(passage));
  }

  project(nx: number, ny: number, nz = 0, part = "body") {
    // The torso follows the passage. Stroke flexion grows down the tail
    // stock, without adding an independent whole-body bob.
    const rear = clamp((-nx - 0.35) / 0.55, 0, 1);
    let along = nx - 1;
    let vertical = ny + Math.sin(this.phase) * 0.23 * rear * rear;
    if (part === "fluke") {
      // Both lobes lie in the same horizontal plane. Pitch the whole fluke
      // about its root as it heaves vertically, rather than wagging it laterally.
      const pitch = Math.cos(this.phase) * 0.3;
      const chord = nx + 0.9;
      along = -1.9 + chord * Math.cos(pitch);
      vertical = 0.04 + Math.sin(this.phase) * 0.23 + chord * Math.sin(pitch);
    }
    const pitchedAlong =
      along * Math.cos(this.pitch) - vertical * Math.sin(this.pitch);
    const pitchedY =
      along * Math.sin(this.pitch) + vertical * Math.cos(this.pitch);
    const cosine = Math.cos(this.heading),
      sine = Math.sin(this.heading);
    return {
      x: this.head.x + (pitchedAlong * cosine - nz * sine) * this.scale,
      y:
        this.head.y +
        (pitchedY + (pitchedAlong * sine + nz * cosine) * DEPTH_PROJECTION) *
          this.scale,
    };
  }
}
