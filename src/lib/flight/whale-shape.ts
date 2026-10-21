function insidePolygon(
  x: number,
  y: number,
  vertices: readonly (readonly [number, number])[],
) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i],
      b = vertices[j];
    if (!a || !b) throw new Error("Whale polygon has a missing vertex");
    const [ax, ay] = a,
      [bx, by] = b;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
      inside = !inside;
  }
  return inside;
}

const flukes: [number, number][] = [
  [-0.65, 0.02],
  [-1.18, -0.36],
  [-1.08, -0.06],
  [-0.92, 0.03],
  [-1.12, 0.19],
  [-1.16, 0.42],
  [-0.65, 0.1],
];
const flipper: [number, number][] = [
  [0.35, 0.17],
  [0.1, 0.53],
  [-0.26, 0.65],
  [-0.08, 0.39],
  [-0.06, 0.2],
];
const dorsal: [number, number][] = [
  [-0.5, -0.18],
  [-0.29, -0.39],
  [-0.2, -0.21],
];

/** Elliptical body plus flukes and swept fins, sampled as individual dots. */
function bodyContains(x: number, y: number) {
  const t = (x - 0.13) / 0.86;
  const radius = 0.3 * (0.72 + (0.28 * (t + 1)) / 2);
  return (
    t * t + (y / radius) ** 2 < 1 ||
    insidePolygon(x, y, flipper) ||
    insidePolygon(x, y, dorsal)
  );
}

export function whaleContains(x: number, y: number) {
  return bodyContains(x, y) || insidePolygon(x, y, flukes);
}

export function whalePoints() {
  const points = [];
  for (let row = 0; row < 44; row++)
    for (let col = 0; col < 92; col++) {
      const x = -1.2 + col * 0.024,
        y = -0.4 + row * 0.025;
      if (whaleContains(x, y)) {
        const part = bodyContains(x, y) ? "body" : x > -0.9 ? "stock" : "fluke";
        const t = (x - 0.13) / 0.86;
        // A shallow body volume makes yaw turns foreshorten rather than flip.
        const section =
          Math.sqrt(Math.max(0, 1 - t * t - (y / 0.3) ** 2)) * 0.22;
        points.push({
          x,
          y: part === "body" ? y : 0.04,
          z: part === "body" ? section * ((row + col) % 2 ? 1 : -1) : y - 0.04,
          part,
          edge:
            !whaleContains(x - 0.025, y) ||
            !whaleContains(x + 0.025, y) ||
            !whaleContains(x, y - 0.025) ||
            !whaleContains(x, y + 0.025),
        });
      }
    }
  return points;
}
