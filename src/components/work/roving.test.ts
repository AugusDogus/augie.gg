import { describe, expect, test } from "bun:test";
import { rovingTarget } from "./roving";

const order = ["a", "b", "c"];

describe("rovingTarget", () => {
  test("moves down with ArrowDown or j", () => {
    expect(rovingTarget(order, "a", "ArrowDown")).toBe("b");
    expect(rovingTarget(order, "b", "j")).toBe("c");
  });

  test("moves up with ArrowUp or k", () => {
    expect(rovingTarget(order, "c", "ArrowUp")).toBe("b");
    expect(rovingTarget(order, "b", "k")).toBe("a");
  });

  test("stops at the ends", () => {
    expect(rovingTarget(order, "c", "ArrowDown")).toBeNull();
    expect(rovingTarget(order, "a", "k")).toBeNull();
  });

  test("jumps with Home and End", () => {
    expect(rovingTarget(order, "b", "Home")).toBe("a");
    expect(rovingTarget(order, "b", "End")).toBe("c");
  });

  test("ignores other keys and unknown rows", () => {
    expect(rovingTarget(order, "a", "Enter")).toBeNull();
    expect(rovingTarget(order, "z", "ArrowDown")).toBeNull();
  });
});
