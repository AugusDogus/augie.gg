import { describe, expect, test } from "bun:test";
import { valueAt } from "./route";
import {
  BEAD_FLOATS,
  MEANDER,
  STREAM_IDS,
  Stream,
  WAKE,
  WakeRing,
  type StreamId,
} from "./streams";

const streams = {
  under: new Stream("under"),
  high: new Stream("high"),
} satisfies Record<StreamId, Stream>;
const TAU = Math.PI * 2;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const frame = () => ({ x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 });

/** Lowest (ventral) and highest band edges, including swell, meander and wake bulge. */
function bandEdges(stream: Stream, x0: number, x1: number) {
  const point = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
  let bottom = -Infinity,
    right = -Infinity;
  for (let s = stream.start; s <= stream.end; s += 1) {
    stream.route.frame(s, point);
    const reach =
      stream.halfWidth(s) +
      stream.spec.swell.amplitude +
      MEANDER.amplitude +
      WAKE.lateral;
    for (const side of [-1, 1]) {
      const x = point.x + point.nx * reach * side,
        y = point.y + point.ny * reach * side;
      right = Math.max(right, x);
      if (x >= x0 && x <= x1) bottom = Math.max(bottom, y);
    }
  }
  return { bottom, right };
}

describe("air streams", () => {
  test("the undercurrent clears the caption", () => {
    expect(bandEdges(streams.under, 900, 1110).bottom).toBeLessThanOrEqual(785);
  });

  test("the high current clears the card, the ship spires and the nav", () => {
    expect(bandEdges(streams.high, 330, 426).bottom).toBeLessThanOrEqual(135);
    expect(bandEdges(streams.high, 715, 805).bottom).toBeLessThanOrEqual(121);
    const end = streams.high.route.frame(streams.high.end, {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      nx: 0,
      ny: 0,
    });
    expect(end.x).toBeLessThan(861);
    expect(bandEdges(streams.high, 0, 0).right).toBeLessThan(870);
  });

  test("bead spans start and end where the painting hides or washes them out", () => {
    const x = (stream: Stream, s: number) =>
      stream.route.frame(s, { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 }).x;
    expect(Math.abs(x(streams.under, streams.under.start) - 495)).toBeLessThan(
      2,
    );
    expect(x(streams.under, streams.under.end)).toBeGreaterThan(1164);
    expect(
      Math.abs(x(streams.under, streams.under.spec.anchor) - 970),
    ).toBeLessThan(2);
    expect(
      Math.abs(x(streams.high, streams.high.spec.anchor) - 450),
    ).toBeLessThan(2);
  });

  test("presence is zero outside the bead span", () => {
    for (const stream of Object.values(streams)) {
      for (const s of [
        stream.start - 50,
        stream.start,
        stream.end,
        stream.end + 1,
      ])
        expect(stream.presence(s, 0)).toBe(0);
      const middle = (stream.start + stream.end) / 2;
      expect(stream.presence(middle, 0)).toBeGreaterThan(0);
      expect(stream.presence(middle, 0)).toBeLessThanOrEqual(1);
    }
  });

  test("a fold sits on each anchor at t=0 and prints at fold presence", () => {
    for (const stream of Object.values(streams)) {
      const anchor = stream.spec.anchor;
      expect(Math.abs(Math.cos(stream.twist(anchor, 0)))).toBeLessThan(1e-6);
      expect(stream.presence(anchor, 0)).toBeCloseTo(
        stream.spec.presence.fold,
        6,
      );
    }
  });

  test("folds drift downstream at the drift speed, slower than the beads", () => {
    for (const stream of Object.values(streams)) {
      const target = stream.twist(stream.spec.anchor, 0);
      // twist() increases with s, so each fold is a unique root per branch.
      const foldAt = (time: number) => {
        let low = -1e5,
          high = 1e5;
        for (let i = 0; i < 100; i++) {
          const middle = (low + high) / 2;
          if (stream.twist(middle, time) < target) low = middle;
          else high = middle;
        }
        return low;
      };
      const k = TAU / stream.spec.twist.wavelength;
      const wobbleReach = (2 * 0.5) / (k - 0.5 / 170);
      const time = 600;
      const travelled = foldAt(time) - stream.spec.anchor;
      expect(
        Math.abs(travelled - stream.spec.twist.drift * time),
      ).toBeLessThanOrEqual(wobbleReach);
      expect(stream.spec.twist.drift).toBeLessThan(stream.spec.flow);
    }
  });

  test("the clock matches the unreduced time terms", () => {
    for (const stream of Object.values(streams)) {
      const clock = new Float32Array(4);
      const span = stream.end - stream.start;
      for (const time of [0, 1.25, 37, 4321.5, 1e6 + 0.3]) {
        stream.clock(time, clock);
        const flow = (stream.spec.flow * time) % span;
        expect(Math.abs(valueAt(clock, 0) - flow)).toBeLessThan(1e-3);
        const twist =
          (TAU / stream.spec.twist.wavelength) * stream.spec.twist.drift * time;
        const swell =
          (TAU / stream.spec.swell.wavelength) * stream.spec.swell.speed * time;
        const wobble = 0.27 * time;
        for (const [index, angle] of [
          [1, twist],
          [2, swell],
          [3, wobble],
        ] as const) {
          const reduced = valueAt(clock, index);
          expect(reduced).toBeGreaterThanOrEqual(0);
          expect(reduced).toBeLessThan(TAU + 1e-6);
          expect(Math.abs(wrap(reduced - angle))).toBeLessThan(1e-5);
        }
        // The shader's twist from the reduced clock matches the TS mirror.
        const s = stream.start + 123;
        const shader =
          s * valueAt(stream.uniforms.shape, 2) -
          valueAt(clock, 1) +
          valueAt(stream.uniforms.range, 3) +
          0.5 * Math.sin(s / 170 + valueAt(clock, 3));
        expect(Math.abs(wrap(shader - stream.twist(s, time)))).toBeLessThan(
          1e-4,
        );
        // The shader's swell from the reduced clock matches the centerline whales ride.
        for (const at of [
          stream.start + 37,
          stream.spec.anchor,
          stream.end - 5,
        ]) {
          const route = stream.route.frame(at, frame()),
            center = stream.centerline(at, time, frame());
          const offset =
            (center.x - route.x) * route.nx + (center.y - route.y) * route.ny;
          const shaderSwell =
            stream.uniforms.swell *
            Math.sin(
              at * valueAt(stream.uniforms.shape, 3) - valueAt(clock, 2),
            );
          expect(offset).toBeCloseTo(shaderSwell, 3);
        }
      }
    }
  });

  test("bead attributes are deterministic with the planned counts", () => {
    expect(STREAM_IDS).toEqual(["high", "under"]);
    expect(streams.under.uniforms.count).toBe(2832);
    expect(streams.high.uniforms.count).toBe(1626);
    for (const id of STREAM_IDS) {
      const again = new Stream(id);
      const { beads, count } = streams[id].uniforms;
      expect(again.uniforms.beads).toEqual(beads);
      expect(beads.length).toBe(count * BEAD_FLOATS);
      const span = streams[id].end - streams[id].start;
      for (let i = 0; i < count; i++) {
        const at = (offset: number) => valueAt(beads, i * BEAD_FLOATS + offset);
        expect(Math.abs(at(0))).toBeLessThan(1);
        expect(Math.abs(at(1))).toBe(0.5);
        expect(at(2)).toBeGreaterThanOrEqual(0);
        expect(at(2)).toBeLessThan(span);
        expect(at(3)).toBeGreaterThanOrEqual(0);
        expect(at(3)).toBeLessThan(1);
        expect(at(5)).toBeGreaterThanOrEqual(0.55);
        expect(at(5)).toBeLessThanOrEqual(1);
      }
    }
    expect(streams.under.uniforms.beads).not.toEqual(
      streams.high.uniforms.beads.slice(0, streams.under.uniforms.beads.length),
    );
  });

  test("the static uniforms describe the route and shape", () => {
    const { uniforms, route, start, end, foldPhase } = streams.under;
    expect(uniforms.route).toBe(route.table);
    expect([...uniforms.range]).toEqual(
      [start, end - start, route.step, foldPhase].map(Math.fround),
    );
    expect(valueAt(uniforms.shape, 1)).toBeCloseTo(route.length, 3);
    expect(uniforms.swell).toBe(5);
    expect([...streams.under.frame.bodies]).toEqual([
      0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0,
    ]);
  });
});

describe("wake ring", () => {
  const unpack = (ring: WakeRing, time: number, flow = 24) =>
    ring.pack(time, flow, new Float32Array(WakeRing.CAPACITY * 4));

  test("holds eight records and evicts the oldest", () => {
    const ring = new WakeRing();
    expect(WakeRing.CAPACITY).toBe(8);
    for (let i = 0; i < 9; i++) ring.emit(100 + i, i * 0.1, 1);
    const packed = unpack(ring, 0.9, 0);
    const arcs = Array.from({ length: 8 }, (_, k) => valueAt(packed, k * 4));
    expect(arcs.sort((a, b) => a - b)).toEqual([
      101, 102, 103, 104, 105, 106, 107, 108,
    ]);
  });

  test("packed arcs ride at the flow speed and amplitudes decay to zero", () => {
    const ring = new WakeRing();
    ring.emit(400, 2, -0.6);
    expect(valueAt(unpack(ring, 2), 0)).toBeCloseTo(400, 4);
    expect(valueAt(unpack(ring, 2), 1)).toBeCloseTo(-0.6, 6);
    expect(valueAt(unpack(ring, 3.5), 0)).toBeCloseTo(400 + 24 * 1.5, 3);
    const late = unpack(ring, 2 + 4.8);
    expect(Math.abs(valueAt(late, 1))).toBeLessThan(0.05 * 0.6);
    expect(Math.abs(valueAt(late, 1))).toBeGreaterThan(0);
    expect([...unpack(ring, 2 + 4.81)]).toEqual(new Array(32).fill(0));
  });

  test("empty slots pack as zeros", () => {
    expect([...unpack(new WakeRing(), 10)]).toEqual(new Array(32).fill(0));
  });
});
