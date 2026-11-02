import { expect, test } from "bun:test";
import {
  ART_HEIGHT,
  ART_WIDTH,
  PAINT_ZOOM,
  fitArt,
  pointerToArt,
  toPainting,
} from "./viewport";

test("the art fits the viewport height and pins to the right edge", () => {
  for (const [width, height, scale, x, wide] of [
    [1440, 900, 1.0297, 204.3, true],
    [1920, 1080, 1.2357, 437.2, true],
    [390, 844, 0.325, 0, false],
  ] as const) {
    const fit = fitArt(width, height);
    expect(fit?.scale).toBeCloseTo(scale, 4);
    expect(fit?.x).toBeCloseTo(x, 1);
    expect(fit?.wide).toBe(wide);
  }
  expect(fitArt(0, 900)).toBeNull();
  expect(fitArt(1440, 0)).toBeNull();
});

test("pointers map to display-art units and back to client pixels", () => {
  const rect = { left: 10, top: 20, width: 1440, height: 900 };
  const fit = fitArt(rect.width, rect.height);
  if (!fit) throw new Error("Expected a fit");
  for (const [x, y] of [
    [0, 0],
    [0.5, 0.5],
    [1, 1],
    [0.25, 0.8],
  ] as const) {
    const clientX = rect.left + fit.x + x * ART_WIDTH * fit.scale,
      clientY = rect.top + y * ART_HEIGHT * fit.scale;
    const art = pointerToArt(rect, clientX, clientY);
    expect(art.x).toBeCloseTo(x, 9);
    expect(art.y).toBeCloseTo(y, 9);
  }
  const outside = pointerToArt({ left: 0, top: 0, width: 0, height: 0 }, 5, 5);
  expect(outside.x < 0 || outside.x > 1).toBe(true);
});

test("painting coordinates apply the composite zoom about the centre", () => {
  expect(toPainting(0.5, 0.5)).toEqual({ x: 600, y: 437 });
  const corner = toPainting(0, 0),
    far = toPainting(1, 1);
  expect(corner.x).toBeCloseTo(36, 9);
  expect(corner.y).toBeCloseTo(26.22, 9);
  expect(far.x).toBeCloseTo(1164, 9);
  expect(far.y).toBeCloseTo(847.78, 9);
  // Inverting the zoom returns the display-art point.
  for (const [x, y] of [
    [0.1, 0.9],
    [0.73, 0.21],
  ] as const) {
    const p = toPainting(x, y);
    expect((600 + (p.x - 600) / PAINT_ZOOM) / ART_WIDTH).toBeCloseTo(x, 9);
    expect((437 + (p.y - 437) / PAINT_ZOOM) / ART_HEIGHT).toBeCloseTo(y, 9);
  }
});
