import { describe, expect, test } from "bun:test";
import { TwitchSub } from "./twitch-sub";

const on = (date: string) => TwitchSub.months(new Date(`${date}T12:00:00Z`));

describe("TwitchSub.months", () => {
  test("is the known count on the day it was read", () => {
    expect(on("2026-11-09")).toBe(54);
  });

  test("holds until the next monthly anniversary", () => {
    expect(on("2026-12-08")).toBe(54);
    expect(on("2026-12-09")).toBe(55);
  });

  test("counts across years", () => {
    expect(on("2027-11-08")).toBe(65);
    expect(on("2027-11-09")).toBe(66);
  });

  test("never drops below the known count", () => {
    expect(on("2026-01-01")).toBe(54);
  });
});
