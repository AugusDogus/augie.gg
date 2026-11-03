import { describe, expect, test } from "bun:test";
import { Drag } from "./drag";

describe("Drag.offset", () => {
  test("follows the pointer downward", () => {
    expect(Drag.offset(120)).toBe(120);
  });

  test("resists upward travel and never passes the limit", () => {
    expect(Drag.offset(0)).toBe(0);
    const small = Drag.offset(-20);
    const large = Drag.offset(-400);
    expect(small).toBeLessThan(0);
    expect(small).toBeGreaterThan(-20);
    expect(large).toBeLessThan(small);
    expect(large).toBeGreaterThan(-Drag.UPWARD_LIMIT);
  });
});

describe("Drag.shouldDismiss", () => {
  const height = 400;

  test("dismisses a quick flick", () => {
    expect(Drag.shouldDismiss({ distance: 30, elapsed: 120, height })).toBe(
      true,
    );
  });

  test("dismisses a slow drag past a quarter of the sheet", () => {
    expect(Drag.shouldDismiss({ distance: 110, elapsed: 2000, height })).toBe(
      true,
    );
  });

  test("keeps a slow, short drag open", () => {
    expect(Drag.shouldDismiss({ distance: 60, elapsed: 1500, height })).toBe(
      false,
    );
  });

  test("never dismisses an upward drag", () => {
    expect(Drag.shouldDismiss({ distance: -200, elapsed: 50, height })).toBe(
      false,
    );
  });
});
