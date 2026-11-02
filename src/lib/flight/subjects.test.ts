import { describe, expect, test } from "bun:test";
import { AWAY, type Gesture, type Hand } from "./instrument";
import { valueAt } from "./route";
import {
  RIG_FLOATS,
  SUBJECTS,
  type Subject,
  type SubjectId,
  Subjects,
  rigCells,
  rigGlsl,
  rigMap,
  rigOffset,
} from "./subjects";

const WIDTH = 600,
  HEIGHT = 437,
  STEP = 1 / 60,
  TAU = Math.PI * 2;
type Box = readonly [x0: number, y0: number, x1: number, y1: number];
/** Measured key boxes of the painted subjects (spec 2.1). */
const KEYS: Record<SubjectId, Box> = {
  skyWhale: [984, 180, 1158, 248],
  diver: [836, 116, 944, 168],
  glareFlock: [1062, 486, 1108, 516],
  shipFlock: [896, 200, 928, 230],
  spireFlock: [1044, 270, 1080, 298],
};
/** Dark paint touching a box border: C's head corner, the ship-whale corner by B, fin pieces by F1. */
const FOREIGN: readonly Box[] = [
  [1120, 150, 1140, 176],
  [806, 160, 830, 180],
  [1044, 515, 1056, 532],
];
const NAV: Box = [911, 66, 1099, 106];
const inside = ([x0, y0, x1, y1]: Box, x: number, y: number) =>
  x >= x0 && x < x1 && y >= y0 && y < y1;
const size = (point: { x: number; y: number }) => Math.hypot(point.x, point.y);

/** Painting px from head to tip at fraction u, and the silhouette's half thickness there. */
const TAPER = { skyWhale: [30, 6], diver: [14, 4] } as const;
/** Whether painting point (x, y) lies on a subject's synthetic silhouette. */
function silhouette(subject: Subject, x: number, y: number) {
  const key = KEYS[subject.id];
  if (!inside(key, x, y)) return false;
  if (subject.kind === "drift") {
    // Three birds: two key-box corners and the middle.
    const [x0, y0, x1, y1] = key,
      mx = (x0 + x1) / 2,
      my = (y0 + y1) / 2;
    return (
      inside([x0, y0, x0 + 8, y0 + 6], x, y) ||
      inside([x1 - 8, y1 - 6, x1, y1], x, y) ||
      inside([mx - 4, my - 3, mx + 4, my + 3], x, y)
    );
  }
  const [hx, hy] = subject.head,
    [tx, ty] = subject.tip;
  const ax = tx - hx,
    ay = ty - hy;
  const u = Math.max(
    0,
    Math.min(1, ((x - hx) * ax + (y - hy) * ay) / (ax * ax + ay * ay)),
  );
  const [head, tip] = TAPER[subject.id];
  const crest = subject.id === "diver" && inside([903, 117, 925, 140], x, y);
  return (
    crest ||
    Math.hypot(x - hx - ax * u, y - hy - ay * u) <= head + (tip - head) * u
  );
}
const dark = (x: number, y: number) =>
  FOREIGN.some((box) => inside(box, x, y)) ||
  SUBJECTS.some((subject) => silhouette(subject, x, y));

const sample = (() => {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) {
      const value = dark(2 * x + 1, 2 * y + 1) ? 60 : 230;
      data.set([value, value - 20, value + 10, 255], (y * WIDTH + x) * 4);
    }
  return { data, width: WIDTH, height: HEIGHT };
})();
const codes = rigMap(sample);
const subjectOf = (code: number) => Math.floor(code / 32);
const weightOf = (code: number) => code % 32;
/** Box cells: centres in [x0, x1) x [y0, y1). */
const cells = ([x0, y0, x1, y1]: Box) => ({
  left: Math.ceil(x0 / 2 - 0.5),
  right: Math.ceil(x1 / 2 - 0.5),
  top: Math.ceil(y0 / 2 - 0.5),
  bottom: Math.ceil(y1 / 2 - 0.5),
});
const along = (subject: Subject, x: number, y: number) => {
  if (subject.kind === "drift") return 1;
  const [hx, hy] = subject.head,
    [tx, ty] = subject.tip;
  return (
    ((x - hx) * (tx - hx) + (y - hy) * (ty - hy)) /
    ((tx - hx) ** 2 + (ty - hy) ** 2)
  );
};
/** Rig floats for one subject at stirred extremes, everything else 0. */
function rigFor(index: number, a: number, b: number) {
  const rig = new Float32Array(RIG_FLOATS);
  rig[2 * index] = a;
  rig[2 * index + 1] = b;
  return rig;
}
function stirredRigs(index: number, subject: Subject) {
  if (subject.kind === "flex")
    return Array.from({ length: 32 }, (_, k) =>
      rigFor(index, (k / 32) * TAU, subject.amplitude * 1.4),
    );
  return Array.from({ length: 8 }, (_, k) =>
    rigFor(
      index,
      subject.limit * Math.cos((k / 8) * TAU),
      subject.limit * Math.sin((k / 8) * TAU),
    ),
  );
}

describe("rig map", () => {
  test("boxes are disjoint", () => {
    SUBJECTS.forEach((a, i) =>
      SUBJECTS.forEach((b, j) => {
        if (i >= j) return;
        const p = cells(a.box),
          q = cells(b.box);
        const apart =
          p.right <= q.left ||
          q.right <= p.left ||
          p.bottom <= q.top ||
          q.bottom <= p.top;
        expect(`${a.id}/${b.id} ${apart}`).toBe(`${a.id}/${b.id} true`);
      }),
    );
  });

  test("codes are 0 outside the boxes and on box borders, and name the box's subject", () => {
    expect(codes).toHaveLength(WIDTH * HEIGHT);
    const owner = new Int8Array(WIDTH * HEIGHT);
    SUBJECTS.forEach((subject, index) => {
      const { left, right, top, bottom } = cells(subject.box);
      for (let y = top; y < bottom; y++)
        for (let x = left; x < right; x++) {
          const border =
            x === left || x === right - 1 || y === top || y === bottom - 1;
          owner[y * WIDTH + x] = border ? -1 : index + 1;
        }
    });
    let live = 0;
    for (let i = 0; i < codes.length; i++) {
      const code = valueAt(codes, i),
        box = valueAt(owner, i);
      if (box <= 0) expect(code).toBe(0);
      else if (code > 0) {
        live++;
        expect(subjectOf(code)).toBe(box);
        expect(weightOf(code)).toBeGreaterThanOrEqual(1);
        expect(weightOf(code)).toBeLessThanOrEqual(31);
      }
    }
    expect(Math.max(...codes)).toBeLessThanOrEqual(5 * 32 + 31);
    expect(live).toBeGreaterThan(4000);
  });

  test("posterior key cells and every flock key cell carry full weight", () => {
    SUBJECTS.forEach((subject, index) => {
      const { left, right, top, bottom } = cells(subject.box);
      let checked = 0;
      for (let y = top; y < bottom; y++)
        for (let x = left; x < right; x++) {
          const px = 2 * x + 1,
            py = 2 * y + 1;
          if (!silhouette(subject, px, py)) continue;
          if (subject.kind === "flex" && along(subject, px, py) < subject.rigid)
            continue;
          checked++;
          expect([subject.id, valueAt(codes, y * WIDTH + x)]).toEqual([
            subject.id,
            32 * (index + 1) + 31,
          ]);
        }
      expect(checked).toBeGreaterThan(20);
    });
  });

  test("dark paint touching a box border is foreign: no weight on or within 2 px of it", () => {
    for (const blob of FOREIGN) {
      const [x0, y0, x1, y1] = blob;
      let near = 0;
      for (let y = 0; y < HEIGHT; y++)
        for (let x = 0; x < WIDTH; x++) {
          const px = 2 * x + 1,
            py = 2 * y + 1;
          const dx = Math.max(x0 - px, 0, px - (x1 - 1)),
            dy = Math.max(y0 - py, 0, py - (y1 - 1));
          if (Math.hypot(dx, dy) > 2) continue;
          near++;
          expect(valueAt(codes, y * WIDTH + x)).toBe(0);
        }
      expect(near).toBeGreaterThan(20);
    }
    // Without the rejection, C's matte would reach the blob by its head.
    const [x0, , x1, y1] = FOREIGN[0] ?? [0, 0, 0, 0];
    const below = Math.floor(y1 / 2) + 4;
    let reached = false;
    for (let x = Math.ceil(x0 / 2); x < Math.floor(x1 / 2); x++)
      if (valueAt(codes, below * WIDTH + x) > 0) reached = true;
    expect(reached).toBe(true);
  });

  test("rigCells keeps the lattice RGB and stores the code in alpha", () => {
    const lattice = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    for (let i = 0; i < lattice.length; i++) lattice[i] = (i * 37) % 256;
    const bytes = rigCells(
      { data: lattice, width: WIDTH, height: HEIGHT },
      codes,
    );
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes).toHaveLength(lattice.length);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      for (let c = 0; c < 3; c++)
        if (valueAt(bytes, i * 4 + c) !== valueAt(lattice, i * 4 + c))
          throw new Error(`RGB changed at cell ${i}`);
      if (valueAt(bytes, i * 4 + 3) !== valueAt(codes, i))
        throw new Error(`Alpha is not the rig code at cell ${i}`);
    }
    expect(() =>
      rigCells({ data: lattice, width: WIDTH, height: HEIGHT }, codes.slice(1)),
    ).toThrow(RangeError);
  });

  test("no foldover: the spectral |grad d| stays at or under 0.5 at stirred amplitude", () => {
    const point = { x: 0, y: 0 };
    let worst = 0;
    SUBJECTS.forEach((subject, index) => {
      const { left, right, top, bottom } = cells(subject.box);
      const w = right - left + 1,
        h = bottom - top + 1;
      const field = new Float64Array(w * h * 2);
      for (const rig of stirredRigs(index, subject)) {
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const cx = left + x,
              cy = top + y,
              code = valueAt(codes, cy * WIDTH + cx);
            rigOffset(index + 1, 2 * cx + 1, 2 * cy + 1, rig, point);
            const weight = weightOf(code) / 31;
            field[(y * w + x) * 2] = weight * point.x;
            field[(y * w + x) * 2 + 1] = weight * point.y;
          }
        for (let y = 0; y < h - 1; y++)
          for (let x = 0; x < w - 1; x++) {
            const i = (y * w + x) * 2;
            const at = (j: number) => valueAt(field, j);
            const a = (at(i + 2) - at(i)) / 2,
              b = (at(i + 2 * w) - at(i)) / 2,
              c = (at(i + 3) - at(i + 1)) / 2,
              d = (at(i + 2 * w + 1) - at(i + 1)) / 2;
            const sum = a * a + b * b + c * c + d * d,
              det = a * d - b * c;
            worst = Math.max(
              worst,
              Math.sqrt((sum + Math.sqrt(sum * sum - 4 * det * det)) / 2),
            );
          }
      }
    });
    expect(worst).toBeGreaterThan(0.2);
    expect(worst).toBeLessThanOrEqual(0.5);
  });

  test("nothing displaces inside the nav box", () => {
    const point = { x: 0, y: 0 };
    const { left, right, top, bottom } = cells(NAV);
    let weighted = 0;
    SUBJECTS.forEach((subject, index) => {
      for (const rig of stirredRigs(index, subject))
        for (let y = Math.max(0, top); y < bottom; y++)
          for (let x = left; x < right; x++) {
            const code = valueAt(codes, y * WIDTH + x);
            // Geometry alone pins it: every flex box cell in the nav has r = 0.
            if (
              subject.kind === "flex" &&
              inside(subject.box, 2 * x + 1, 2 * y + 1)
            )
              expect(
                size(rigOffset(index + 1, 2 * x + 1, 2 * y + 1, rig, point)),
              ).toBe(0);
            if (subjectOf(code) !== index + 1) continue;
            weighted++;
            expect(
              size(rigOffset(index + 1, 2 * x + 1, 2 * y + 1, rig, point)),
            ).toBe(0);
          }
    });
    // The diver's crest feathers into the nav, so the pin is not vacuous.
    expect(weighted).toBeGreaterThan(0);
  });

  test("rigOffset bends whales along the normal from the rigid point and moves flocks rigidly", () => {
    const point = { x: 0, y: 0 };
    const flock = rigFor(3, 1.5, -2.5);
    expect(rigOffset(4, 0, 0, flock, point)).toEqual({ x: 1.5, y: -2.5 });
    SUBJECTS.forEach((subject, index) => {
      if (subject.kind !== "flex") return;
      const rig = rigFor(index, 1.1, 5);
      const [hx, hy] = subject.head,
        [tx, ty] = subject.tip;
      const length = Math.hypot(tx - hx, ty - hy);
      // The tip swings by amp * sin(phase - wave) along (-axis.y, axis.x).
      const swing = 5 * Math.sin(1.1 - subject.wave);
      const tip = rigOffset(index + 1, tx, ty, rig, point);
      expect(tip.x).toBeCloseTo((-(ty - hy) / length) * swing, 5);
      expect(rigOffset(index + 1, tx, ty, rig, point).y).toBeCloseTo(
        ((tx - hx) / length) * swing,
        5,
      );
      // Nothing ahead of the rigid point moves.
      const u = subject.rigid - 0.001;
      expect(
        size(
          rigOffset(
            index + 1,
            hx + (tx - hx) * u,
            hy + (ty - hy) * u,
            rig,
            point,
          ),
        ),
      ).toBe(0);
      expect(size(rigOffset(index + 1, hx, hy, rig, point))).toBe(0);
    });
    expect(() => rigOffset(0, 0, 0, flock, point)).toThrow(RangeError);
    expect(() => rigOffset(6, 0, 0, flock, point)).toThrow(RangeError);
  });

  test("rigGlsl is generated from SUBJECTS with the rig uniform layout", () => {
    const glsl = rigGlsl();
    expect(glsl).toContain("vec2 rigOffset(float id, vec2 p) {");
    expect(glsl).toContain(
      "if (id < 1.5) return rigFlex(p, vec2(1152., 214.), vec2(979., 187.), 0.45, 2.2, rig[0].x, rig[0].y);",
    );
    expect(glsl).toContain(
      "if (id < 2.5) return rigFlex(p, vec2(942., 160.), vec2(836., 118.), 0.48, 2.2, rig[0].z, rig[0].w);",
    );
    expect(glsl).toContain("if (id < 3.5) return rig[1].xy;");
    expect(glsl).toContain("if (id < 4.5) return rig[1].zw;");
    expect(glsl).toContain("  return rig[2].xy;\n}");
    for (const subject of SUBJECTS)
      if (subject.kind === "flex")
        for (const value of [...subject.head, ...subject.tip])
          expect(glsl).toContain(`${value}.`);
  });
});

/** Ticks `seconds` of 60 Hz steps from `from`, with the hand and gestures chosen per tick time. */
function run(
  subjects: Subjects,
  from: number,
  seconds: number,
  hand: (time: number) => Hand,
  gestures: (time: number) => readonly Gesture[] = () => [],
  each?: (time: number, out: Float32Array) => void,
) {
  const out = new Float32Array(RIG_FLOATS);
  const first = Math.round(from / STEP);
  for (let i = 1; i <= Math.round(seconds / STEP); i++) {
    const time = (first + i) * STEP;
    subjects.tick(time, hand(time), gestures(time));
    if (each) {
      subjects.write(out);
      each(time, out);
    }
  }
  subjects.write(out);
  return out;
}
const hover = (x: number, y: number, vx = 0, vy = 0): Hand => ({
  kind: "hover",
  x,
  y,
  vx,
  vy,
});
const WHALES = [
  { index: 0, id: "skyWhale", amplitude: 4.5, period: 4.9 },
  { index: 1, id: "diver", amplitude: 3.5, period: 3.7 },
] as const;
/** The stir a whale's written amplitude implies: A = A0 g (1 + .4 s) wake. */
function stirOf(subjects: Subjects, out: Float32Array, whale: number) {
  const { amplitude, id } = WHALES[whale] ?? WHALES[0];
  const wake = valueAt(out, 10);
  return (
    (valueAt(out, 2 * whale + 1) / (amplitude * subjects.gait(id) * wake) - 1) /
    0.4
  );
}
const C_MID = { x: 1065, y: 200 },
  B_MID = { x: 889, y: 139 };

describe("subjects", () => {
  test("every output is exactly 0 at t <= 0, whatever the hand does", () => {
    const subjects = new Subjects();
    const out = run(
      subjects,
      -4,
      4,
      (time) => hover(C_MID.x + time, C_MID.y, 900, 0),
      () => [{ kind: "tap", x: 1084, y: 500 }],
      (_, frame) => expect([...frame]).toEqual(Array(RIG_FLOATS).fill(0)),
    );
    expect([...out]).toEqual(Array(RIG_FLOATS).fill(0));
  });

  test("wakes up over 2 s and carries the wake in rig[2].z", () => {
    const subjects = new Subjects();
    const wake = (time: number) => {
      const t = Math.min(1, time / 2);
      return t * t * (3 - 2 * t);
    };
    run(
      subjects,
      0,
      3,
      () => AWAY,
      undefined,
      (time, out) => {
        expect(valueAt(out, 10)).toBeCloseTo(wake(time), 6);
        expect(valueAt(out, 11)).toBe(0);
      },
    );
  });

  test("phases advance by at most the stirred rate per tick", () => {
    const subjects = new Subjects();
    const previous = [0, 0];
    run(
      subjects,
      0,
      60,
      (time) =>
        time % 4 < 2
          ? hover(C_MID.x, C_MID.y, 500, 0)
          : hover(B_MID.x, B_MID.y, 0, 400),
      (time) => (time % 1 < STEP ? [{ kind: "tap", x: 900, y: 150 }] : []),
      (_, out) =>
        WHALES.forEach(({ index, period }) => {
          const phase = valueAt(out, 2 * index);
          const step = (phase - valueAt(previous, index) + TAU) % TAU;
          expect(step).toBeLessThanOrEqual((TAU / period) * 1.6 * STEP + 1e-5);
          expect(step).toBeGreaterThan(0);
          previous[index] = phase;
        }),
    );
  });

  test("a fast hand within reach snaps stir to 1, and it falls below 0.05 within 8 s of the hand leaving", () => {
    const subjects = new Subjects();
    run(subjects, 0, 5, () => AWAY);
    const out = run(subjects, 5, STEP, () => hover(C_MID.x, C_MID.y, 0, 800));
    expect(stirOf(subjects, out, 0)).toBeCloseTo(1, 5);
    expect(stirOf(subjects, out, 1)).toBeCloseTo(0, 5);
    const later = run(subjects, 5 + STEP, 8, () => AWAY);
    expect(stirOf(subjects, later, 0)).toBeLessThan(0.05);
    expect(stirOf(subjects, later, 0)).toBeGreaterThan(0);
  });

  test("a slow hand stirs a whale in 0.4 s steps and taps snap stir", () => {
    const subjects = new Subjects();
    run(subjects, 0, 5, () => AWAY);
    const out = run(subjects, 5, 0.4, () => hover(B_MID.x, B_MID.y, 30, 0));
    expect(stirOf(subjects, out, 1)).toBeCloseTo(1 - Math.exp(-1), 2);
    const tapped = run(
      subjects,
      5.4,
      STEP,
      () => AWAY,
      () => [{ kind: "tap", x: C_MID.x, y: C_MID.y + 40 }],
    );
    expect(stirOf(subjects, tapped, 0)).toBeCloseTo(1, 5);
  });

  test("an away hand never stirs or shies anything", () => {
    const subjects = new Subjects();
    const sway = [
      [1084, 10.3],
      [910, 13.9],
      [1060, 17.3],
    ] as const;
    let phases = [0, 0, 0];
    run(
      subjects,
      0,
      40,
      () => AWAY,
      () => [{ kind: "release", x: C_MID.x, y: C_MID.y }],
      (time, out) => {
        for (const whale of [0, 1])
          expect(Math.abs(stirOf(subjects, out, whale))).toBeLessThan(1e-6);
        const wake = valueAt(out, 10);
        phases = phases.map(
          (phase, k) => (phase + (TAU / (sway[k]?.[1] ?? 1)) * STEP) % TAU,
        );
        phases.forEach((phase, k) => {
          expect(valueAt(out, 4 + 2 * k)).toBeCloseTo(
            wake * 2 * Math.sin(phase),
            5,
          );
          expect(valueAt(out, 5 + 2 * k)).toBeCloseTo(
            wake * Math.cos(1.3 * phase + 0.7),
            5,
          );
        });
      },
    );
  });

  test("flocks shy away from a near hand and never move more than 4 px", () => {
    // Mirrored hands stir equally, so the hover phase matches and only shy differs.
    const near = (x: number, y: number) =>
      run(new Subjects(), 0, 10, (time) =>
        time < 5 ? AWAY : hover(x, y, 0, 0),
      );
    const fromLeft = near(1064, 500),
      fromRight = near(1104, 500);
    expect(valueAt(fromLeft, 4) - valueAt(fromRight, 4)).toBeGreaterThan(3.5);
    // A hand at the centre lifts the flock; one just above it pushes it down.
    const atCentre = near(910, 215),
      above = near(910, 214.99);
    expect(valueAt(atCentre, 7) - valueAt(above, 7)).toBeLessThan(-3.5);
    const centred = new Subjects();
    run(
      centred,
      0,
      60,
      (time) =>
        time % 3 < 1.5
          ? hover(1084, 500, 0, 0)
          : hover(910 + 30 * Math.sin(time), 215, 20, 0),
      (time) => (time % 2 < STEP ? [{ kind: "tap", x: 1060, y: 284 }] : []),
      (_, out) => {
        for (const k of [2, 3, 4])
          expect(
            Math.hypot(valueAt(out, 2 * k), valueAt(out, 2 * k + 1)),
          ).toBeLessThanOrEqual(4 + 1e-5);
      },
    );
  });

  test("calm() drops stir and shy", () => {
    const subjects = new Subjects();
    run(subjects, 0, 5, () => hover(C_MID.x, C_MID.y, 0, 800));
    subjects.calm();
    const out = new Float32Array(RIG_FLOATS);
    subjects.write(out);
    expect(stirOf(subjects, out, 0)).toBeCloseTo(0, 6);
    // Mirrored hands stir the glare flock equally and shy it apart; calm() leaves only the shared sway.
    const calmed = (x: number) => {
      const flock = new Subjects();
      const frame = run(flock, 0, 10, (time) =>
        time < 5 ? AWAY : hover(x, 500, 0, 0),
      );
      const shied = valueAt(frame, 4);
      flock.calm();
      flock.write(frame);
      return { shied, after: [...frame] };
    };
    const left = calmed(1064),
      right = calmed(1104);
    expect(left.shied - right.shied).toBeGreaterThan(3.5);
    expect(left.after).toEqual(right.after);
    expect(() => subjects.write(new Float32Array(8))).toThrow(RangeError);
  });

  test("the conductor always has a whale at 0.7 gait or more and never both at 0.9", () => {
    const subjects = new Subjects();
    const leads: { id: string; at: number }[] = [];
    run(
      subjects,
      -4,
      604,
      () => AWAY,
      undefined,
      (time) => {
        const sky = subjects.gait("skyWhale"),
          diver = subjects.gait("diver");
        expect(Math.max(sky, diver)).toBeGreaterThanOrEqual(0.7);
        expect(Math.min(sky, diver)).toBeLessThan(0.9);
        const leader = sky > diver ? "skyWhale" : "diver";
        if (leads.at(-1)?.id !== leader) leads.push({ id: leader, at: time });
      },
    );
    expect(leads.length).toBeGreaterThan(40);
    for (let i = 1; i < leads.length - 1; i++) {
      const lead = leads[i],
        next = leads[i + 1];
      if (!lead || !next) continue;
      const held = next.at - lead.at;
      const [low, high] = lead.id === "skyWhale" ? [9.8, 14.7] : [7.4, 11.1];
      expect(held).toBeGreaterThanOrEqual(low - 0.02);
      expect(held).toBeLessThanOrEqual(high + 0.02);
      expect(next.id).not.toBe(lead.id);
    }
  });

  test("a scripted 30 s hand path ends in the recorded state", () => {
    const subjects = new Subjects();
    const hand = (time: number): Hand => {
      if (time < 3) return AWAY;
      if (time < 8) return hover(1060, 205, 0, 0);
      if (time < 8.5) return hover(800 + 320 * (time - 8), 140, 320, 0);
      if (time < 12) return AWAY;
      if (time < 20) return hover(1050 + 10 * (time - 12), 280, 10, 0);
      if (time < 24)
        return {
          kind: "press",
          x: 900,
          y: 220,
          vx: 0,
          vy: 0,
          since: time - 20,
          origin: [900, 220],
        };
      return AWAY;
    };
    const taps = (time: number): readonly Gesture[] =>
      Math.abs(time - 12) < STEP / 2 ? [{ kind: "tap", x: 1084, y: 500 }] : [];
    const out = run(subjects, 0, 30, hand, taps);
    const state = [
      ...Array.from(out, (value) => Math.round(value * 1e5) / 1e5),
      Math.round(subjects.gait("skyWhale") * 1e5) / 1e5,
      Math.round(subjects.gait("diver") * 1e5) / 1e5,
    ];
    // Recorded from this implementation; a change here is a change in motion.
    expect(state).toEqual([
      3.87167, 4.50035, 3.89513, 1.4001, 1.66214, -0.39058, -0.77258, 0.56834,
      1.78177, -0.50065, 1, 0, 1, 0.4,
    ]);
  });
});
