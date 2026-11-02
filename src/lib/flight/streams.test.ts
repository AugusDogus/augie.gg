import { describe, expect, test } from "bun:test";
import { valueAt } from "./route";
import {
  BEAD_FLOATS,
  MEANDER,
  PLUCK,
  PluckRing,
  STREAM_IDS,
  Stream,
  WAKE,
  WAKE_SLOTS,
  WakeRing,
  type StreamId,
} from "./streams";

const streams = {
  under: new Stream("under"),
  high: new Stream("high"),
  veil: new Stream("veil"),
} satisfies Record<StreamId, Stream>;
const TAU = Math.PI * 2;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const frame = () => ({ x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 });

/** Lowest (ventral) and highest band edges, including swell, meander and wake bulge. */
function bandEdges(stream: Stream, x0: number, x1: number) {
  const point = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
  let bottom = -Infinity,
    top = Infinity,
    right = -Infinity,
    lowest = -Infinity;
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
      lowest = Math.max(lowest, y);
      if (x >= x0 && x <= x1) {
        bottom = Math.max(bottom, y);
        top = Math.min(top, y);
      }
    }
  }
  return { bottom, top, right, lowest };
}
const x = (stream: Stream, s: number) => stream.route.frame(s, frame()).x;

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

  test("the veil clears the ship's lower fringe and stays above y 600", () => {
    expect(bandEdges(streams.veil, 650, 800).top).toBeGreaterThanOrEqual(530);
    expect(bandEdges(streams.veil, 0, 0).lowest).toBeLessThanOrEqual(600);
  });

  test("the veil comes out of the crevasse, fades in under the card and ends behind the wing", () => {
    const veil = streams.veil;
    expect(Math.abs(x(veil, veil.start) - 203)).toBeLessThan(2);
    expect(Math.abs(x(veil, veil.end) - 900)).toBeLessThan(2);
    expect(x(veil, veil.start + veil.spec.fade[0])).toBeLessThanOrEqual(437);
    expect(Math.abs(x(veil, veil.spec.anchor) - 640)).toBeLessThan(2);
    const [entry, inside] = veil.spec.gate ?? [0, 0],
      [leave, gone] = veil.spec.exit ?? [0, 0];
    expect(Math.abs(x(veil, entry) - 330)).toBeLessThan(2);
    expect(Math.abs(x(veil, inside) - 380)).toBeLessThan(2);
    expect(Math.abs(x(veil, leave) - 840)).toBeLessThan(2);
    expect(Math.abs(x(veil, gone) - 880)).toBeLessThan(2);
    expect([...veil.uniforms.behind]).toEqual([0, 1, 1]);
    expect([...streams.under.uniforms.behind]).toEqual([1, 0, 0]);
    expect([...streams.high.uniforms.behind]).toEqual([1, 0, 0]);
  });

  test("the shader's fade end is the bead span for every current", () => {
    for (const stream of Object.values(streams)) {
      const { range, shape } = stream.uniforms;
      const span = valueAt(range, 1);
      expect(Math.min(span, valueAt(shape, 1) - valueAt(range, 0))).toBe(span);
    }
  });

  test("currents stay calm: slow beads, a small swell", () => {
    for (const stream of Object.values(streams)) {
      expect(stream.spec.flow).toBeLessThanOrEqual(24);
      expect(stream.spec.swell.amplitude).toBeLessThanOrEqual(5);
    }
    expect(streams.veil.spec.flow).toBe(11);
    expect(streams.veil.spec.swell.amplitude).toBe(3);
  });

  test("bead spans start and end where the painting hides or washes them out", () => {
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
    expect(STREAM_IDS).toEqual(["high", "under", "veil"]);
    expect(streams.under.uniforms.count).toBe(2832);
    expect(streams.high.uniforms.count).toBe(1626);
    expect(streams.veil.uniforms.count).toBe(2136);
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

  test("appending the veil leaves the older currents' beads unchanged", () => {
    const digest = (values: Float32Array) => {
      let hash = 0x811c9dc5;
      for (const word of new Uint32Array(values.buffer, 0, values.length))
        hash = Math.imul(hash ^ word, 0x01000193);
      return (hash >>> 0).toString(16).padStart(8, "0");
    };
    expect(digest(streams.high.uniforms.beads)).toBe("fe0cc569");
    expect(digest(streams.under.uniforms.beads)).toBe("cc848d02");
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

  test("packs at a slot offset without touching other slots", () => {
    const ring = new WakeRing();
    ring.emit(300, 0, 1);
    const out = new Float32Array(WAKE_SLOTS * 4).fill(7);
    ring.pack(1, 10, out, 2);
    expect([...out.subarray(0, 8)]).toEqual(new Array(8).fill(7));
    expect([...out.subarray(8, 12)]).toEqual([
      310,
      Math.fround(Math.exp(-1 / WAKE.decay)),
      1,
      0,
    ]);
    expect([...out.subarray(12, 40)]).toEqual(new Array(28).fill(0));
    expect([...out.subarray(40)]).toEqual(new Array(16).fill(7));
  });
});

describe("pluck ring", () => {
  const packed = (ring: PluckRing, time: number, flow: number) =>
    ring.pack(time, flow, new Float32Array(WAKE_SLOTS * 4).fill(7));
  const pulse = (out: Float32Array, slot: number) =>
    Array.from({ length: 4 }, (_, i) => valueAt(out, slot * 4 + i));

  test("a pluck runs two pulses at flow ± 90 that decay over 1.4 s", () => {
    const ring = new PluckRing();
    ring.emit(500, 10, -0.8);
    for (const age of [0, 0.5, 2, 3.5]) {
      const out = packed(ring, 10 + age, 24);
      const amplitude = 0.7 * -0.8 * Math.exp(-age / 1.4);
      const down = pulse(out, 8),
        up = pulse(out, 9);
      expect(valueAt(down, 0)).toBeCloseTo(500 + 114 * age, 3);
      expect(valueAt(up, 0)).toBeCloseTo(500 - 66 * age, 3);
      for (const slot of [down, up]) {
        expect(valueAt(slot, 1)).toBeCloseTo(amplitude, 6);
        expect(valueAt(slot, 2)).toBeCloseTo(6 * age, 5);
        expect(valueAt(slot, 3)).toBe(0);
      }
    }
    expect(PLUCK.split).toBe(90);
    expect(pulse(packed(ring, 13.51, 24), 8)).toEqual([0, 0, 0, 0]);
    expect(pulse(packed(ring, 9.99, 24), 9)).toEqual([0, 0, 0, 0]);
  });

  test("packs only slots 8 to 13 and keeps the newest three records", () => {
    const ring = new PluckRing();
    for (let i = 0; i < 4; i++) ring.emit(100 * (i + 1), i, 1);
    const out = packed(ring, 3, 11);
    expect([...out.subarray(0, 32)]).toEqual(new Array(32).fill(7));
    const arcs = Array.from({ length: 3 }, (_, k) =>
      valueAt(out, (8 + 2 * k) * 4),
    );
    expect(arcs.map(Math.round).sort((a, b) => a - b)).toEqual([400, 401, 402]);
  });

  test("a stream packs its plucks after its whale wakes", () => {
    const stream = new Stream("veil");
    stream.pluck(400, 1, 0);
    stream.wakes.emit(300, 0, 0.7);
    stream.wakes.pack(0.2, 11, stream.frame.wakes);
    stream.plucks.pack(0.2, 11, stream.frame.wakes);
    expect(valueAt(stream.frame.wakes, 0)).toBeCloseTo(302.2, 4);
    expect(valueAt(stream.frame.wakes, 8 * 4)).toBeCloseTo(400 + 101 * 0.2, 4);
    expect(valueAt(stream.frame.wakes, 9 * 4)).toBeCloseTo(400 - 79 * 0.2, 4);
  });

  test("the summed pulse is clamped to ±1, so the wake bulge stays within WAKE.lateral", () => {
    const stream = new Stream("under");
    for (let i = 0; i < 8; i++) stream.wakes.emit(600, 0, 1);
    stream.wakes.pack(1, 0, stream.frame.wakes);
    expect(stream.pulse(600, stream.frame.wakes)).toBe(1);
    const empty = new Float32Array(WAKE_SLOTS * 4);
    expect(stream.pulse(600, empty)).toBe(0);
    const one = new Stream("under");
    one.wakes.emit(600, 0, -0.5);
    one.wakes.pack(1, 0, one.frame.wakes);
    expect(one.pulse(600, one.frame.wakes)).toBeCloseTo(
      -0.5 * Math.exp(-1 / WAKE.decay),
      6,
    );
  });
});

describe("lateral", () => {
  test("gives the arc and the signed offset of a point on the normal", () => {
    const at = frame(),
      out = { s: 0, d: 0 };
    for (const stream of Object.values(streams))
      for (const s of [stream.start + 40, stream.spec.anchor, stream.end - 40])
        for (const time of [0, 7.3])
          for (const d of [-60, -20, 0, 15, 45]) {
            stream.centerline(s, time, at);
            stream.lateral(at.x + at.nx * d, at.y + at.ny * d, time, out);
            // One tangent refine: sub-pixel across, a few px along on the curves.
            expect(Math.abs(out.d - d)).toBeLessThan(0.2);
            expect(Math.abs(out.s - s)).toBeLessThan(5);
          }
  });

  test("flips sign across the centerline", () => {
    const at = frame(),
      out = { s: 0, d: 0 };
    const veil = streams.veil;
    veil.centerline(400, 2, at);
    const above = veil.lateral(at.x, at.y - 10, 2, out).d;
    const below = veil.lateral(at.x, at.y + 10, 2, out).d;
    expect(above).toBeLessThan(0);
    expect(below).toBeGreaterThan(0);
  });
});

describe("hand slot", () => {
  test("the hand parts its own slot and frees it at zero height", () => {
    for (const [id, slot] of [
      ["under", 2],
      ["high", 1],
      ["veil", 1],
    ] as const) {
      const stream = new Stream(id);
      expect(stream.spec.handSlot).toBe(slot);
      stream.part(500, -6, 7);
      const bodies = [...stream.frame.bodies];
      expect(bodies.slice(slot * 4, slot * 4 + 4)).toEqual([500, -6, 34, 7]);
      stream.part(500, -6, 0);
      expect([...stream.frame.bodies]).toEqual([
        0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0,
      ]);
    }
  });

  test("holds tests the band plus a margin inside the span", () => {
    const under = streams.under;
    const s = under.spec.anchor,
      edge = under.halfWidth(s);
    expect(under.holds(s, edge + 11.9, 12)).toBe(true);
    expect(under.holds(s, -(edge + 11.9), 12)).toBe(true);
    expect(under.holds(s, edge + 12, 12)).toBe(false);
    expect(under.holds(under.start - 1, 0, 12)).toBe(false);
    expect(under.holds(under.end + 1, 0, 12)).toBe(false);
  });
});
