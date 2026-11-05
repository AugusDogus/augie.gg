import { expect, test } from "bun:test";
import { POD } from "./pod";
import { Stream } from "./streams";
import { SPINE_LENGTH, heave } from "./whale-body";
import { Swimmer } from "./whale-swim";

const under = new Stream("under");
const high = new Stream("high");
const H = 1 / 60;
const steadyAir = (s: number) =>
  POD.hero.cruise * (1 - POD.hero.relax * under.coupling(s));
const hero = (s: number, phase = 0) =>
  new Swimmer(POD.hero, s, phase, 0, steadyAir(s));

/** Mean ground speed and stroke period while the nose crosses [from, to). */
function measure(whale: Swimmer, stream: Stream, from: number, to: number) {
  while (whale.s < from) whale.step(H, stream);
  const s = whale.s,
    phase = whale.phase;
  let time = 0;
  while (whale.s < to) {
    whale.step(H, stream);
    time += H;
  }
  return {
    speed: (whale.s - s) / time,
    period: (2 * Math.PI * time) / (whale.phase - phase),
  };
}

test("tail strokes supply thrust while the whale carries momentum between strokes", () => {
  for (const s of [200, 700]) {
    const pushing = hero(s, 0),
      gliding = hero(s, Math.PI / 2);
    pushing.step(H, under);
    gliding.step(H, under);
    expect(pushing.air).toBeGreaterThan(gliding.air);
    expect(gliding.air).toBeGreaterThan(0.9 * steadyAir(s));
  }
});

test("whales travel forward along the route without jumps", () => {
  for (const [whale, stream] of [
    [hero(-100), under],
    [new Swimmer(POD.far, -100, 0, 0, 3.9), high],
  ] as const) {
    const nose = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
    stream.centerline(whale.s, 0, nose);
    let previous = { x: nose.x, y: nose.y, s: whale.s };
    for (let i = 0; i < 60 * 120; i++) {
      whale.step(H, stream);
      stream.centerline(whale.s, (i + 1) * H, nose);
      if (
        whale.s <= previous.s ||
        nose.x <= previous.x ||
        Math.hypot(nose.x - previous.x, nose.y - previous.y) >= 1
      )
        throw new Error(`Whale reversed or jumped at step ${i}`);
      previous = { x: nose.x, y: nose.y, s: whale.s };
    }
  }
});

test("the stroke rate follows airspeed, so a carried whale glides", () => {
  const whale = hero(600);
  for (let i = 0; i < 600; i++) {
    whale.step(H, under);
    const ratio = whale.air / POD.hero.cruise;
    if (ratio < 0.6 || ratio > 1.25) continue;
    const expected = ((2 * Math.PI) / POD.hero.period) * ratio;
    expect(Math.abs(whale.rate / expected - 1)).toBeLessThan(0.02);
  }
  const carried = measure(hero(500), under, 600, 1000);
  expect(carried.period).toBeGreaterThanOrEqual(4.7);
  expect(carried.period).toBeLessThanOrEqual(5.8);
  const far = measure(new Swimmer(POD.far, 300, 0, 0, 3.9), high, 400, 800);
  expect(far.period).toBeGreaterThan(carried.period);
});

test("the current boosts ground speed and slows the stroke after the boost ramp", () => {
  const whale = hero(-200);
  const cloud = measure(whale, under, 0, 280);
  const current = measure(whale, under, 457 + 150, 1000);
  expect(current.speed).toBeGreaterThanOrEqual(1.8 * cloud.speed);
  expect(current.period).toBeGreaterThanOrEqual(1.3 * cloud.period);
  expect(cloud.speed).toBeCloseTo(POD.hero.cruise, 0);
});

test("stroke events alternate sides at each heave extreme of the fluke root, at the flukes", () => {
  const whale = hero(600);
  const events: { s: number; side: number; at: number; heave: number }[] = [];
  for (let i = 0; i < 60 * 20; i++) {
    const event = whale.step(H, under);
    if (event)
      events.push({
        ...event,
        at: whale.s,
        heave: heave(SPINE_LENGTH, whale.phase),
      });
  }
  expect(events.length).toBeGreaterThanOrEqual(6);
  events.forEach((event, i) => {
    expect(event.s).toBeCloseTo(event.at - POD.hero.length, 9);
    // The side is the extreme the root just reached: +1 ventral, −1 dorsal.
    expect(Math.abs(event.heave)).toBeGreaterThan(0.07);
    expect(event.side).toBe(Math.sign(event.heave));
    const next = events[i + 1];
    if (next) expect(next.side).toBe(-event.side);
  });
});

test("a far whale fades in by age and dissolves by position", () => {
  const far = new Swimmer(POD.far, 330, 0, 0, 3.9);
  far.respawn(330, POD.far.lane, 1);
  far.step(H, high);
  expect(far.opacity).toBe(0);
  while (far.age < 1) far.step(H, high);
  expect(far.opacity).toBeGreaterThan(0.45);
  while (far.age < 2) far.step(H, high);
  expect(far.opacity).toBeCloseTo(1, 6);
  const nose = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0 };
  while (high.route.frame(far.s, nose).x < 790) {
    const before = far.opacity;
    far.step(H, high);
    expect(far.opacity).toBeLessThanOrEqual(before);
  }
  expect(far.opacity).toBe(0);
});

test("a neutral response leaves the swim bit-identical", () => {
  const neutral = {
    laneShift: 0,
    bend: 0,
    rateGain: 1,
    airKick: 0,
    coupling: 1,
  };
  const plain = hero(300, 0.4),
    responding = hero(300, 0.4);
  for (let i = 0; i < 60 * 30; i++) {
    responding.respond(neutral);
    expect(responding.step(H, under)).toEqual(plain.step(H, under));
    expect([
      responding.s,
      responding.air,
      responding.phase,
      responding.lane,
    ]).toEqual([plain.s, plain.air, plain.phase, plain.lane]);
  }
});

test("moods shift the lane from the pass's base lane, slow the carry and kick the airspeed", () => {
  const whale = hero(700);
  whale.respawn(700, -12);
  expect(whale.baseLane).toBe(-12);
  whale.respond({
    laneShift: -6,
    bend: 3,
    rateGain: 2,
    airKick: 0,
    coupling: 1,
  });
  expect(whale.lane).toBe(-18);
  expect(whale.bend).toBe(3);
  expect(whale.rate).toBeCloseTo(2 * whale.pace, 9);
  const before = whale.air;
  whale.respond({
    laneShift: 0,
    bend: 0,
    rateGain: 1,
    airKick: 1,
    coupling: 1,
  });
  expect(whale.air).toBeCloseTo(before + POD.hero.cruise, 9);
  const curious = {
    laneShift: 0,
    bend: 0,
    rateGain: 1,
    airKick: 0,
    coupling: 0.55,
  };
  const lingering = hero(700);
  for (let i = 0; i < 600; i++) {
    lingering.respond(curious);
    lingering.step(H, under);
  }
  const s = lingering.s;
  for (let i = 0; i < 600; i++) {
    lingering.respond(curious);
    lingering.step(H, under);
  }
  expect((lingering.s - s) / 10).toBeCloseTo(26, 0);
});

test("a whale is hidden exactly while its opacity is zero", () => {
  const far = new Swimmer(POD.far, 330, 0, 0, 3.9);
  far.respawn(330, POD.far.lane, 1);
  far.step(H, high);
  expect(far.hidden).toBe(true);
  while (far.age < 0.5) far.step(H, high);
  expect(far.hidden).toBe(false);
});
