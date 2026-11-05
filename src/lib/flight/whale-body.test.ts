import { describe, expect, test } from "bun:test";
import { valueAt } from "./route";
import { Stream } from "./streams";
import {
  ROOT_LAG,
  SPINE_LENGTH,
  SPINE_NODES,
  VERTEX_FLOATS,
  WHALE_INDICES,
  WHALE_OUTLINES,
  WHALE_VERTICES,
  type WhalePose,
  heave,
  writeWhale,
} from "./whale-body";

/** The documented layout: 30 × (dorsal, spine, ventral), far fin, flukes, hump, near fin. */
const dorsal = (i: number) => i * 3,
  spine = (i: number) => i * 3 + 1,
  ventral = (i: number) => i * 3 + 2;
const TAU = Math.PI * 2;
const FAR_FIN = 90,
  FLUKE_ROOT = 94,
  UPPER_TIP = 95,
  NOTCH = 96,
  LOWER_TIP = 97,
  HUMP_APEX = 100,
  NEAR_FIN = 102;

const under = new Stream("under");
const high = new Stream("high");
const pose = (phase: number, s = 742, bend = 0): WhalePose => ({
  s,
  lane: -10,
  phase,
  length: 170,
  bend,
});
function draw(whale: WhalePose, stream = under, time = 0) {
  const out = new Float32Array(WHALE_VERTICES * VERTEX_FLOATS);
  writeWhale(whale, stream, time, out, 0);
  return (vertex: number) => ({
    x: valueAt(out, vertex * VERTEX_FLOATS),
    y: valueAt(out, vertex * VERTEX_FLOATS + 1),
    shade: valueAt(out, vertex * VERTEX_FLOATS + 2),
    arc: valueAt(out, vertex * VERTEX_FLOATS + 3),
  });
}
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const nodeX = (i: number) => (SPINE_LENGTH * i) / (SPINE_NODES - 1);

describe("whale mesh", () => {
  test("writes exactly one whale of finite floats at its first vertex", () => {
    const out = new Float32Array(3 * WHALE_VERTICES * VERTEX_FLOATS).fill(NaN);
    writeWhale(pose(1), under, 0, out, WHALE_VERTICES);
    out.forEach((value, i) => {
      const inside =
        i >= WHALE_VERTICES * VERTEX_FLOATS &&
        i < 2 * WHALE_VERTICES * VERTEX_FLOATS;
      expect(Number.isFinite(value)).toBe(inside);
    });
  });

  test("indices form 124 triangles over every vertex", () => {
    expect(WHALE_INDICES).toHaveLength(372);
    expect(WHALE_INDICES.every((index) => index < WHALE_VERTICES)).toBe(true);
    expect(new Set(WHALE_INDICES).size).toBe(WHALE_VERTICES);
  });

  test("the outlines trace the far fin, the body, and the near fin", () => {
    const [far, body, near] = WHALE_OUTLINES;
    expect([...(far ?? [])]).toEqual([90, 91, 92, 93]);
    expect([...(near ?? [])]).toEqual([102, 103, 104, 105]);
    expect([...(body ?? [])]).toEqual([
      ...Array.from({ length: 20 }, (_, i) => dorsal(i)),
      HUMP_APEX,
      ...Array.from({ length: 9 }, (_, i) => dorsal(21 + i)),
      UPPER_TIP,
      NOTCH,
      LOWER_TIP,
      ...Array.from({ length: 30 }, (_, i) => ventral(29 - i)),
    ]);
  });

  test("the body outline never crosses itself", () => {
    const outline = WHALE_OUTLINES[1] ?? new Uint16Array();
    const crosses = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      c: { x: number; y: number },
      d: { x: number; y: number },
    ) => {
      const side = (
        p: { x: number; y: number },
        q: { x: number; y: number },
        r: { x: number; y: number },
      ) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
      return (
        side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0
      );
    };
    for (let k = 0; k < 16; k++) {
      const at = draw(pose((k / 16) * Math.PI * 2));
      const points = [...outline].map(at);
      for (let i = 0; i < points.length; i++)
        for (let j = i + 2; j < points.length; j++) {
          if (i === 0 && j === points.length - 1) continue;
          const a = points[i],
            b = points[i + 1],
            c = points[j],
            d = points[(j + 1) % points.length];
          if (!a || !b || !c || !d) throw new Error("Missing outline point");
          expect(crosses(a, b, c, d)).toBe(false);
        }
    }
  });

  test("proportions: a deep throat, a long flipper, and broad flukes", () => {
    const at = draw(pose(0.7));
    const L = 170;
    const depth = distance(at(dorsal(10)), at(ventral(10))) / L;
    expect(Math.abs(nodeX(10) - 0.32)).toBeLessThan(0.01);
    expect(depth).toBeGreaterThanOrEqual(0.22);
    expect(depth).toBeLessThanOrEqual(0.27);
    const midpoint = (a: number, b: number) => ({
      x: (at(a).x + at(b).x) / 2,
      y: (at(a).y + at(b).y) / 2,
    });
    const reach = distance(
      midpoint(NEAR_FIN, NEAR_FIN + 3),
      midpoint(NEAR_FIN + 1, NEAR_FIN + 2),
    );
    expect(reach / L).toBeGreaterThanOrEqual(0.26);
    expect(distance(at(UPPER_TIP), at(LOWER_TIP)) / L).toBeGreaterThanOrEqual(
      0.18,
    );
    expect(at(FAR_FIN).shade).toBeLessThan(at(spine(5)).shade);
    expect(at(NEAR_FIN).shade).toBeGreaterThan(at(FAR_FIN).shade);
  });
});

describe("whale rig", () => {
  test("the torso does not bob", () => {
    const phases = Array.from({ length: 24 }, (_, k) => (k / 24) * 7);
    for (let x = 0; x <= 0.45; x += 0.01)
      for (const phase of phases) expect(heave(x, phase)).toBe(0);
    const before = draw(pose(0));
    for (const phase of phases) {
      const after = draw(pose(phase));
      for (let v = 0; v < 15 * 3; v++) expect(after(v)).toEqual(before(v));
    }
  });

  test("the rigid torso lies on the route at its lane", () => {
    const route = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
    for (const time of [0, 3.3, 41]) {
      const whale = pose(2.2);
      const at = draw(whale, under, time);
      for (let i = 0; i < 15; i++) {
        under.centerline(whale.s - nodeX(i) * whale.length, time, route);
        expect(at(spine(i)).x).toBe(
          Math.fround(route.x + route.nx * whale.lane),
        );
        expect(at(spine(i)).y).toBe(
          Math.fround(route.y + route.ny * whale.lane),
        );
        expect(at(spine(i)).arc).toBe(
          Math.fround(whale.s - nodeX(i) * whale.length),
        );
      }
    }
  });

  test("the flukes swing while the head stays still", () => {
    const phase = ROOT_LAG - Math.PI / 4;
    const before = draw(pose(phase)),
      after = draw(pose(phase + Math.PI / 2));
    expect(distance(before(spine(0)), after(spine(0)))).toBe(0);
    for (const tip of [UPPER_TIP, LOWER_TIP])
      expect(distance(before(tip), after(tip))).toBeGreaterThan(0.05 * 170);
  });

  test("the fluke is a rigid crescent whose lobes sweep together through each stroke", () => {
    const rest = draw(pose(0));
    const span = distance(rest(UPPER_TIP), rest(LOWER_TIP));
    expect(span).toBeGreaterThan(0.1 * 170);
    for (let k = 0; k < 16; k++) {
      const at = draw(pose((k / 16) * TAU));
      expect(distance(at(UPPER_TIP), at(LOWER_TIP))).toBeCloseTo(span, 3);
    }
    // Mid-stroke quarters, centred on peak ventral (+1) and dorsal (−1) root velocity.
    for (const [centre, direction] of [
      [ROOT_LAG, 1],
      [ROOT_LAG + Math.PI, -1],
    ] as const) {
      const before = draw(pose(centre - Math.PI / 4)),
        after = draw(pose(centre + Math.PI / 4));
      for (const tip of [UPPER_TIP, LOWER_TIP])
        expect((after(tip).y - before(tip).y) * direction).toBeGreaterThan(
          0.06 * 170,
        );
    }
  });

  test("the fluke root heaves 0.075L, and the fluke pitches 0.35 rad with its heave velocity", () => {
    const whale = pose(0);
    const L = whale.length;
    const route = under.centerline(whale.s - SPINE_LENGTH * L, 0, {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      nx: 0,
      ny: 0,
    });
    for (let k = 0; k < 32; k++) {
      const phase = (k / 32) * TAU;
      const at = draw(pose(phase));
      const root = at(spine(SPINE_NODES - 1));
      const offset =
        (root.x - route.x) * route.nx + (root.y - route.y) * route.ny;
      expect((offset - whale.lane) / L).toBeCloseTo(
        0.075 * Math.sin(phase - ROOT_LAG),
        4,
      );
      // Signed angle from the body normal at the root to the fluke's root chord; positive tips the trailing edge dorsal.
      const normal = {
          x: at(ventral(SPINE_NODES - 1)).x - at(dorsal(SPINE_NODES - 1)).x,
          y: at(ventral(SPINE_NODES - 1)).y - at(dorsal(SPINE_NODES - 1)).y,
        },
        chord = {
          x: at(FLUKE_ROOT + 4).x - at(FLUKE_ROOT).x,
          y: at(FLUKE_ROOT + 4).y - at(FLUKE_ROOT).y,
        };
      const pitch = Math.atan2(
        normal.x * chord.y - normal.y * chord.x,
        normal.x * chord.x + normal.y * chord.y,
      );
      expect(pitch).toBeCloseTo(0.35 * Math.cos(phase - ROOT_LAG), 3);
    }
  });

  test("each vertex carries the route arc of its own position, for the dissolve gate", () => {
    const route = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
    /** Arc whose route normal passes through the point. */
    const project = (point: { x: number; y: number }, guess: number) => {
      let behind = guess - 120,
        ahead = guess + 120;
      for (let i = 0; i < 60; i++) {
        const middle = (behind + ahead) / 2;
        under.route.frame(middle, route);
        const along =
          (point.x - route.x) * route.tx + (point.y - route.y) * route.ty;
        if (along > 0) behind = middle;
        else ahead = middle;
      }
      return behind;
    };
    let worst = 0;
    for (let k = 0; k < 8; k++) {
      const at = draw(pose((k / 8) * TAU));
      for (let v = 0; v < WHALE_VERTICES; v++)
        worst = Math.max(
          worst,
          Math.abs(at(v).arc - project(at(v), at(v).arc)),
        );
    }
    // Fins and flukes reach 20-50 px behind their nodes; the gate ramps over 40 px.
    expect(worst).toBeLessThan(1);
  });

  test("fluke pitch leads the heave: the trailing edge lags the root", () => {
    const route = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
    /** Mean tip offset from the root along the route normal; negative is dorsal. */
    const trail = (phase: number) => {
      const whale = pose(phase);
      const at = draw(whale);
      under.centerline(whale.s - SPINE_LENGTH * whale.length, 0, route);
      const root = at(spine(SPINE_NODES - 1));
      return (
        [UPPER_TIP, LOWER_TIP].reduce(
          (sum, tip) =>
            sum +
            (at(tip).x - root.x) * route.nx +
            (at(tip).y - root.y) * route.ny,
          0,
        ) / 2
      );
    };
    const ventralVelocity = trail(ROOT_LAG),
      dorsalVelocity = trail(ROOT_LAG + Math.PI);
    for (const still of [
      trail(ROOT_LAG + Math.PI / 2),
      trail(ROOT_LAG - Math.PI / 2),
    ]) {
      expect(ventralVelocity).toBeLessThan(still);
      expect(dorsalVelocity).toBeGreaterThan(still);
    }
  });

  test("bend turns the head by `bend` along the normal and leaves the fluke root in place", () => {
    const route = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
    for (const bend of [-12, -4.5, 2, 8])
      for (const phase of [0, 1.7, 4]) {
        const whale = pose(phase, 742, bend);
        const bent = draw(whale),
          straight = draw(pose(phase));
        under.centerline(whale.s, 0, route);
        const nose = bent(spine(0)),
          rest = straight(spine(0));
        expect(
          (nose.x - rest.x) * route.nx + (nose.y - rest.y) * route.ny,
        ).toBeCloseTo(bend, 4);
        expect(
          (nose.x - rest.x) * route.tx + (nose.y - rest.y) * route.ty,
        ).toBeCloseTo(0, 4);
        expect(
          distance(
            bent(spine(SPINE_NODES - 1)),
            straight(spine(SPINE_NODES - 1)),
          ),
        ).toBeLessThan(0.5);
        for (const fluke of [FLUKE_ROOT, UPPER_TIP, LOWER_TIP])
          expect(distance(bent(fluke), straight(fluke))).toBeLessThan(0.5);
      }
  });

  test("the belly stays below the back along both routes", () => {
    const route = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
    for (const stream of [under, high])
      for (let s = -200; s < stream.route.length + 400; s += 37)
        for (let k = 0; k < 8; k++) {
          const whale = pose((k / 8) * Math.PI * 2, s);
          const at = draw(whale, stream, s / 10);
          for (let i = 1; i < SPINE_NODES; i++) {
            stream.route.frame(whale.s - nodeX(i) * whale.length, route);
            expect(route.ny).toBeGreaterThan(0);
            const belly =
              (at(ventral(i)).x - at(dorsal(i)).x) * route.nx +
              (at(ventral(i)).y - at(dorsal(i)).y) * route.ny;
            expect(belly).toBeGreaterThan(0);
          }
        }
  });
});
