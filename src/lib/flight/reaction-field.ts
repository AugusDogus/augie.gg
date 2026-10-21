function concentration(values: Float32Array, index: number): number {
  const value = values[index];
  if (value === undefined)
    throw new RangeError(
      `Reaction field index ${index} is outside ${values.length} cells`,
    );
  return value;
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Gray–Scott chemistry from the supplied demo, on a periodic dot grid. */
export class ReactionField {
  width = 96;
  height = 48;
  u = new Float32Array(this.width * this.height).fill(1);
  v = new Float32Array(this.width * this.height);
  nextU = new Float32Array(this.u.length);
  nextV = new Float32Array(this.v.length);

  constructor() {
    for (let i = 0; i < 16; i++)
      this.seed((i * 0.618) % 1, (i * 0.381 + 0.2) % 1);
    this.step(600);
  }

  seed(x: number, y: number) {
    const cx = Math.floor(x * this.width),
      cy = Math.floor(y * this.height);
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const i =
          ((cy + dy + this.height) % this.height) * this.width +
          ((cx + dx + this.width) % this.width);
        this.u[i] = 0.5;
        this.v[i] = 0.3;
      }
  }

  step(iterations = 1) {
    const w = this.width,
      h = this.height;
    for (let step = 0; step < iterations; step++) {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x,
            left = (x + w - 1) % w,
            right = (x + 1) % w;
          const above = ((y + h - 1) % h) * w,
            below = ((y + 1) % h) * w;
          const lap = (a: Float32Array) =>
            -concentration(a, i) +
            0.2 *
              (concentration(a, y * w + left) +
                concentration(a, y * w + right) +
                concentration(a, above + x) +
                concentration(a, below + x)) +
            0.05 *
              (concentration(a, above + left) +
                concentration(a, above + right) +
                concentration(a, below + left) +
                concentration(a, below + right));
          const u = concentration(this.u, i),
            v = concentration(this.v, i),
            reaction = u * v * v;
          this.nextU[i] = clamp(u + lap(this.u) - reaction + 0.037 * (1 - u));
          this.nextV[i] = clamp(
            v + 0.5 * lap(this.v) + reaction - (0.037 + 0.06) * v,
          );
        }
      [this.u, this.nextU] = [this.nextU, this.u];
      [this.v, this.nextV] = [this.nextV, this.v];
    }
  }

  sample(x: number, y: number) {
    const col = Math.min(this.width - 1, Math.floor(clamp(x) * this.width));
    const row = Math.min(this.height - 1, Math.floor(clamp(y) * this.height));
    return concentration(this.v, row * this.width + col);
  }
}
