import { describe, expect, test } from "bun:test";
import { valueAt } from "./route";
import { BEAD_FLOATS, ROUTE_SAMPLES } from "./streams";
import {
  Trail,
  WISP,
  WISP_BEADS,
  WISP_COUNT,
  type WispDraw,
  Wisps,
} from "./trail";

const H = 1 / 60;
const TAU = Math.PI * 2;
/** Drags a live trail along a quarter circle of radius 200 in `steps` ticks. */
function drag(trail: Trail, steps: number, time = 0) {
  trail.begin(300, 500, time, 0);
  for (let i = 1; i <= steps; i++) {
    const angle = (i / steps) * (Math.PI / 2);
    trail.follow(
      300 + 200 * Math.sin(angle),
      300 + 200 * Math.cos(angle),
      time,
    );
  }
  return trail;
}
const sample = (table: Float32Array, i: number) => ({
  x: valueAt(table, i * 4),
  y: valueAt(table, i * 4 + 1),
  nx: valueAt(table, i * 4 + 2),
  ny: valueAt(table, i * 4 + 3),
});

describe("trail", () => {
  test("the wisp beads are 8 fibers of 260 from seed 1610", () => {
    expect(WISP_COUNT).toBe(2080);
    expect(WISP_BEADS).toHaveLength(2080 * BEAD_FLOATS);
  });

  test("writes 64 equal-arc samples with unit normals, head first", () => {
    const trail = drag(new Trail(), 120);
    const table = new Float32Array(ROUTE_SAMPLES * 4);
    const length = trail.write(table);
    expect(length).toBeCloseTo((Math.PI / 2) * 200, -1);
    const head = sample(table, 0);
    expect(head.x).toBeCloseTo(500, 3);
    expect(head.y).toBeCloseTo(300, 3);
    const step = length / (ROUTE_SAMPLES - 1);
    for (let i = 0; i < ROUTE_SAMPLES; i++) {
      const at = sample(table, i);
      expect(Math.hypot(at.nx, at.ny)).toBeCloseTo(1, 5);
      if (i === 0) continue;
      const before = sample(table, i - 1);
      expect(
        Math.abs(Math.hypot(at.x - before.x, at.y - before.y) - step),
      ).toBeLessThan(0.05 * step);
    }
  });

  test("lays a point every 8 px, keeps 64 points and caps the arc at 520 px", () => {
    const slow = new Trail();
    slow.begin(0, 300, 0, 0);
    for (let x = 1; x <= 1000; x++) slow.follow(x, 300, 0);
    expect(slow.count).toBe(WISP.points);
    expect(slow.x(0)).toBe(1000);
    for (let k = 1; k < slow.count; k++)
      expect(slow.x(k - 1) - slow.x(k)).toBe(WISP.spacing);
    const fast = new Trail();
    fast.begin(0, 300, 0, 0);
    for (let x = 30; x <= 1500; x += 30) fast.follow(x, 300, 0);
    expect(1500 - fast.x(fast.count - 1)).toBeLessThanOrEqual(WISP.arc);
    expect(1500 - fast.x(fast.count - 1)).toBeGreaterThan(WISP.arc - 30);
    expect(fast.write(new Float32Array(ROUTE_SAMPLES * 4))).toBeLessThanOrEqual(
      WISP.arc,
    );
  });

  test("points ride the wind", () => {
    const trail = new Trail();
    trail.begin(100, 300, 0, 0);
    for (let x = 101; x <= 200; x++) trail.follow(x, 300, 0);
    const head = { x: trail.x(0), y: trail.y(0) },
      tail = { x: trail.x(trail.count - 1), y: trail.y(trail.count - 1) };
    for (let i = 0; i < 60; i++) trail.advect(H, i * H);
    expect(trail.x(0)).toBeCloseTo(head.x + 18, 6);
    expect(trail.y(0)).toBeCloseTo(head.y - 2, 6);
    expect(trail.x(trail.count - 1)).toBeCloseTo(tail.x + 18, 6);
    expect(trail.y(trail.count - 1)).toBeCloseTo(tail.y - 2, 6);
  });

  test("the gust dies tail first and fades out with its head", () => {
    const trail = new Trail();
    trail.begin(100, 300, 0, 0);
    for (let i = 1; i <= 200; i++) trail.follow(100 + i, 300, i * 0.01);
    trail.release();
    const head = trail.birth(0);
    let count = trail.count,
      time = 2;
    expect(trail.presence(time)).toBe(1);
    while (trail.count > 0) {
      time += H;
      trail.advect(H, time);
      expect(trail.count).toBeLessThanOrEqual(count);
      if (trail.count > 0) {
        expect(trail.birth(0)).toBe(head);
        expect(trail.birth(trail.count - 1) + WISP.life).toBeGreaterThan(time);
      }
      count = trail.count;
    }
    expect(time).toBeCloseTo(head + WISP.life, 1);
  });

  test("a released trail fades over its head-age window, or over a cut", () => {
    const trail = new Trail();
    trail.begin(100, 300, 0, 0);
    for (let x = 101; x <= 200; x++) trail.follow(x, 300, 1);
    trail.release();
    // The head was laid at t = 1.
    const [from, to] = WISP.fade;
    expect(trail.presence(1 + from)).toBe(1);
    expect(trail.presence(1 + (from + to) / 2)).toBeCloseTo(0.5, 6);
    trail.cut(2);
    expect(trail.presence(2)).toBe(1);
    expect(trail.presence(2.4)).toBeCloseTo(0.5, 6);
    expect(trail.presence(2.8)).toBe(0);
  });
});

describe("wisps", () => {
  test("write reuses its arrays and skips ribbons shorter than 24 px", () => {
    const wisps = new Wisps();
    const first = wisps.write(0);
    const arrays = first.flatMap((draw) => [
      draw.route,
      draw.range,
      draw.shape,
      draw.look,
      draw.clock,
      draw.behind,
    ]);
    expect(first.map((draw) => draw.visible)).toEqual([false, false]);
    wisps.begin(300, 300, 0);
    wisps.follow(320, 300, 0);
    expect(wisps.write(0)[0]?.visible).toBe(false);
    wisps.follow(340, 300, 0);
    const second = wisps.write(0);
    expect(second).toBe(first);
    expect(second[0]?.visible).toBe(true);
    second
      .flatMap((draw) => [
        draw.route,
        draw.range,
        draw.shape,
        draw.look,
        draw.clock,
        draw.behind,
      ])
      .forEach((array, i) => expect(Object.is(array, arrays[i])).toBe(true));
    expect([...(second[0]?.behind ?? [])]).toEqual([1, 0, 1]);
    const live = second[0];
    if (!live) throw new Error("Missing live draw");
    expect(valueAt(live.shape, 0)).toBe(WISP.width.live);
    expect(valueAt(live.shape, 1)).toBeCloseTo(40, 4);
    expect(valueAt(live.range, 1)).toBe(520);
    expect(valueAt(live.range, 2)).toBeCloseTo(40 / 63, 5);
    expect(valueAt(live.look, 0)).toBeCloseTo(8, 5);
    expect(valueAt(live.look, 1)).toBeCloseTo(16, 5);
  });

  test("bead and fold clocks advance with head travel, so they stay put in the air", () => {
    const wisps = new Wisps();
    wisps.begin(300, 300, 5);
    for (let x = 301; x <= 400; x++) wisps.follow(x, 300, 5);
    const clock = (time: number) => {
      const values = wisps.write(time)[0]?.clock ?? new Float32Array(4);
      return { flow: valueAt(values, 0), fold: valueAt(values, 1) };
    };
    const before = clock(5);
    for (let x = 401; x <= 448; x++) wisps.follow(x, 300, 5);
    const after = clock(5);
    // The head moved 48 px, laid as six 8 px points.
    expect(after.flow - before.flow).toBeCloseTo(48, 3);
    expect(after.fold - before.fold).toBeCloseTo((TAU / 300) * 48, 5);
    const later = clock(6);
    expect(later.flow - after.flow).toBeCloseTo(16, 3);
    expect(later.fold - after.fold).toBeCloseTo((TAU / 300) * 6, 5);
  });

  test("release turns the wisp into a wider gust, and a new press ends it within 0.8 s", () => {
    const wisps = new Wisps();
    wisps.begin(300, 300, 0);
    for (let x = 301; x <= 500; x++) wisps.follow(x, 300, 0);
    expect(wisps.drawing).toBe(true);
    wisps.release();
    expect(wisps.drawing).toBe(false);
    const [live, gust] = wisps.write(0);
    expect(live?.visible).toBe(false);
    expect(gust?.visible).toBe(true);
    expect(valueAt(gust?.shape ?? [], 0)).toBe(WISP.width.gust);
    wisps.begin(600, 300, 1);
    let time = 1;
    while (wisps.write(time)[1]?.visible) {
      time += H;
      wisps.tick(H, time);
    }
    expect(time).toBeLessThanOrEqual(1 + WISP.cut + H);
  });

  /** A 200 px gust released at t = 0, then a press at t = 1 held for `ticks` ticks while dragging `travel` px. */
  const cutBy = (ticks: number, travel: number) => {
    const wisps = new Wisps();
    wisps.begin(300, 300, 0);
    for (let x = 301; x <= 500; x++) wisps.follow(x, 300, 0);
    wisps.release();
    let time = 1;
    wisps.begin(600, 400, time);
    for (let i = 1; i <= ticks; i++) {
      time += H;
      wisps.tick(H, time);
      wisps.follow(600 + (travel * i) / ticks, 400, time);
    }
    wisps.release();
    return { wisps, time };
  };
  const fades = (draw: WispDraw | undefined) => valueAt(draw?.look ?? [], 3);

  test("a click cuts the gust, which fades smoothly over 0.8 s instead of vanishing", () => {
    let { wisps, time } = cutBy(6, 0);
    let [live, gust] = wisps.write(time);
    expect(live?.visible).toBe(false);
    expect(gust?.visible).toBe(true);
    let presence = fades(gust);
    expect(presence).toBeGreaterThan(0.9);
    while (gust?.visible) {
      time += H;
      wisps.tick(H, time);
      [live, gust] = wisps.write(time);
      if (!gust?.visible) break;
      const next = fades(gust);
      expect(next).toBeLessThanOrEqual(presence);
      expect(presence - next).toBeLessThan(0.04);
      presence = next;
    }
    expect(time).toBeGreaterThanOrEqual(1 + WISP.cut - H);
    expect(time).toBeLessThanOrEqual(1 + WISP.cut + H);
  });

  test("a short drag released while the cut gust fades waits as a gust, then takes its slot", () => {
    let { wisps, time } = cutBy(18, 120);
    const [waiting, fading] = wisps.write(time);
    expect(waiting?.visible).toBe(true);
    expect(valueAt(waiting?.shape ?? [], 0)).toBe(WISP.width.gust);
    expect(fades(waiting)).toBe(WISP.presence.fold);
    const length = valueAt(waiting?.shape ?? [], 1);
    expect(length).toBeGreaterThan(100);
    expect(fading?.visible).toBe(true);
    expect(fades(fading)).toBeGreaterThan(0.5);
    while (time < 1 + WISP.cut + 2 * H) {
      time += H;
      wisps.tick(H, time);
    }
    const [live, gust] = wisps.write(time);
    expect(live?.visible).toBe(false);
    expect(gust?.visible).toBe(true);
    expect(valueAt(gust?.shape ?? [], 1)).toBeCloseTo(length, 3);
    expect(valueAt(gust?.shape ?? [], 0)).toBe(WISP.width.gust);
  });
});
