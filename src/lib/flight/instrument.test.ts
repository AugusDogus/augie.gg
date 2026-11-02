import { describe, expect, test } from "bun:test";
import { AWAY, Instrument, type PointerKind } from "./instrument";
import { toPainting } from "./viewport";

const H = 1 / 60;
/** A down at client (100, 100) and an up `travel` px right after `ms`. */
function click(
  travel: number,
  ms: number,
  kind: PointerKind = "mouse",
  between: (instrument: Instrument) => void = () => {},
) {
  const instrument = new Instrument();
  instrument.move(0.5, 0.5, kind, false, 0);
  instrument.down(0.5, 0.5, kind, false, 100, 100, 1000);
  between(instrument);
  instrument.up(0.5, 0.5, kind, 100 + travel, 100, 1000 + ms);
  return instrument.frame(H).gestures;
}

describe("taps", () => {
  test("a tap is at most 10 client px and 300 ms", () => {
    const at = toPainting(0.5, 0.5);
    for (const kind of ["mouse", "pen", "touch"] as const)
      expect(click(10, 300, kind)).toEqual([{ kind: "tap", ...at }]);
    expect(click(11, 100, "touch")).toEqual([]);
    expect(click(0, 301, "touch")).toEqual([]);
    expect(click(11, 100)).toEqual([{ kind: "release", ...at }]);
    expect(click(0, 301)).toEqual([{ kind: "release", ...at }]);
  });

  test("a cancel, a scroll or a blocked target rules a tap out", () => {
    expect(click(0, 100, "touch", (i) => i.cancel())).toEqual([]);
    expect(click(0, 100, "mouse", (i) => i.cancel())).toEqual([]);
    const blocked = new Instrument();
    blocked.down(0.5, 0.5, "touch", true, 100, 100, 0);
    blocked.up(0.5, 0.5, "touch", 100, 100, 50);
    expect(blocked.frame(H).gestures).toEqual([]);
    const outside = new Instrument();
    outside.down(-0.1, 0.5, "touch", false, 100, 100, 0);
    outside.up(-0.1, 0.5, "touch", 100, 100, 50);
    expect(outside.frame(H).gestures).toEqual([]);
  });

  test("gestures are returned once and clear() drops them", () => {
    const instrument = new Instrument();
    instrument.down(0.3, 0.4, "touch", false, 0, 0, 0);
    instrument.up(0.3, 0.4, "touch", 0, 0, 10);
    expect(instrument.frame(H).gestures).toHaveLength(1);
    expect(instrument.frame(H).gestures).toHaveLength(0);
    instrument.down(0.3, 0.4, "touch", false, 0, 0, 20);
    instrument.up(0.3, 0.4, "touch", 0, 0, 30);
    instrument.clear();
    expect(instrument.frame(H).gestures).toEqual([]);
  });
});

describe("hands", () => {
  test("touch never hovers or presses", () => {
    const instrument = new Instrument();
    instrument.move(0.5, 0.5, "touch", false, 0);
    expect(instrument.frame(H).hand).toBe(AWAY);
    instrument.down(0.5, 0.5, "touch", false, 0, 0, 0);
    instrument.move(0.6, 0.5, "touch", false, 10);
    expect(instrument.frame(H).hand).toBe(AWAY);
    expect(instrument.pointer.active).toBe(false);
  });

  test("a mouse hovers, presses from its origin and hovers again on release", () => {
    const instrument = new Instrument();
    instrument.move(0.4, 0.5, "mouse", false, 0);
    const hover = instrument.frame(H);
    expect(hover.hand).toMatchObject({
      kind: "hover",
      ...toPainting(0.4, 0.5),
    });
    expect(hover.previous).toBe(AWAY);
    instrument.down(0.4, 0.5, "mouse", false, 0, 0, 10);
    instrument.move(0.45, 0.5, "mouse", false, 20);
    const first = instrument.frame(H).hand;
    const second = instrument.frame(H).hand;
    const origin = toPainting(0.4, 0.5);
    if (first.kind !== "press" || second.kind !== "press")
      throw new Error("Expected a press");
    expect(first.origin).toEqual([origin.x, origin.y]);
    expect(first.since).toBe(0);
    expect(second.since).toBeCloseTo(H, 9);
    instrument.up(0.45, 0.5, "mouse", 300, 0, 900);
    const after = instrument.frame(H);
    expect(after.hand.kind).toBe("hover");
    expect(after.previous).toBe(second);
  });

  test("blocked targets, leaving and outside the art send the hand away", () => {
    const instrument = new Instrument();
    instrument.move(0.5, 0.5, "mouse", false, 0);
    instrument.move(0.5, 0.5, "mouse", true, 1);
    expect(instrument.frame(H).hand).toBe(AWAY);
    instrument.move(0.5, 0.5, "pen", false, 2);
    instrument.leave();
    expect(instrument.frame(H).hand).toBe(AWAY);
    instrument.move(1.2, 0.5, "mouse", false, 3);
    expect(instrument.frame(H).hand).toBe(AWAY);
    instrument.move(0.5, 0.5, "mouse", false, 4);
    instrument.down(0.5, 0.5, "mouse", false, 0, 0, 5);
    instrument.move(0.52, 0.5, "mouse", true, 6);
    expect(instrument.frame(H).hand).toBe(AWAY);
    instrument.up(0.52, 0.5, "mouse", 900, 0, 900);
    expect(instrument.frame(H).gestures).toEqual([]);
  });

  test("velocities are in painting px/s, smoothed over about 0.06 s", () => {
    const instrument = new Instrument();
    // 0.25 display-art widths per second is 300 display px/s, 282 painting px/s.
    for (let i = 0; i <= 60; i++) {
      instrument.move(0.2 + 0.25 * i * H, 0.5, "mouse", false, i * 1000 * H);
      const hand = instrument.frame(H).hand;
      if (hand.kind !== "hover") throw new Error("Expected a hover");
      if (i === 0) expect(hand.vx).toBe(0);
      if (i === 60) {
        expect(hand.vx).toBeCloseTo(0.25 * 1200 * 0.94, 3);
        expect(hand.vy).toBe(0);
      }
    }
    const settle = new Instrument();
    settle.move(0.2, 0.5, "mouse", false, 0);
    settle.frame(H);
    settle.move(0.2, 0.6, "mouse", false, 1);
    const jump = settle.frame(0.06).hand;
    if (jump.kind !== "hover") throw new Error("Expected a hover");
    expect(jump.vy).toBeCloseTo(
      ((0.1 * 874 * 0.94) / 0.06) * (1 - Math.exp(-1)),
      6,
    );
  });

  test("the legacy pointer follows a hovering or pressing mouse or pen", () => {
    const instrument = new Instrument();
    expect(instrument.pointer).toEqual({ x: 0.5, y: 0.5, active: false });
    instrument.move(0.3, 0.7, "pen", false, 0);
    expect(instrument.pointer).toEqual({ x: 0.3, y: 0.7, active: true });
    instrument.down(0.31, 0.7, "mouse", false, 0, 0, 1);
    expect(instrument.pointer).toEqual({ x: 0.31, y: 0.7, active: true });
    instrument.move(0.31, 0.7, "mouse", true, 2);
    expect(instrument.pointer).toEqual({ x: 0.31, y: 0.7, active: false });
    instrument.move(0.4, 0.4, "touch", false, 3);
    expect(instrument.pointer.active).toBe(false);
  });

  test("clear() sends the hand away and forgets the last hand", () => {
    const instrument = new Instrument();
    instrument.move(0.5, 0.5, "mouse", false, 0);
    instrument.frame(H);
    instrument.clear();
    const sense = instrument.frame(H);
    expect(sense.hand).toBe(AWAY);
    expect(sense.previous).toBe(AWAY);
  });
});
