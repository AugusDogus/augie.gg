import { describe, expect, test } from "bun:test";
import { type Clip, Playback, PlaybackGroup } from "./playback";

/** A clip whose clock moves only when a test says so. */
class FakeClip implements Clip {
  currentTime = 0;
  playbackRate = 1;
  paused = true;
  readonly listeners = new Map<string, Set<() => void>>();
  constructor(readonly duration: number) {}
  addEventListener(type: string, listener: () => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
  start(at: number) {
    this.currentTime = at;
    this.paused = false;
    this.emit("playing");
  }
}

describe("Playback.drift", () => {
  test("is how far the follower is ahead of the lead", () => {
    expect(Playback.drift(1, 1.25, 10)).toBeCloseTo(0.25);
    expect(Playback.drift(4, 3.5, 10)).toBeCloseTo(-0.5);
  });

  test("goes the short way round the loop", () => {
    expect(Playback.drift(9.98, 0.01, 10)).toBeCloseTo(0.03);
    expect(Playback.drift(0.01, 9.98, 10)).toBeCloseTo(-0.03);
  });
});

describe("Playback.progress", () => {
  test("is the share of the loop already played", () => {
    expect(Playback.progress(0, 10)).toBe(0);
    expect(Playback.progress(2.5, 10)).toBeCloseTo(0.25);
    expect(Playback.progress(10, 10)).toBe(1);
  });

  test("stays within the loop when the clock runs past either end", () => {
    expect(Playback.progress(10.02, 10)).toBe(1);
    expect(Playback.progress(-0.01, 10)).toBe(0);
  });

  test("is nothing while the length is unknown", () => {
    expect(Playback.progress(3, Number.NaN)).toBe(0);
    expect(Playback.progress(3, 0)).toBe(0);
    expect(Playback.progress(3, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("PlaybackGroup", () => {
  test("puts a follower on the lead's time when it starts playing", () => {
    const group = new PlaybackGroup();
    const lead = new FakeClip(10);
    const phone = new FakeClip(10);
    group.join(lead, "lead");
    group.join(phone, "follow");
    lead.start(2.4);
    phone.start(0);
    expect(phone.currentTime).toBeCloseTo(2.4);
  });

  test("jumps a follower that is far off to the lead's time", () => {
    const group = new PlaybackGroup();
    const lead = new FakeClip(10);
    const phone = new FakeClip(10);
    group.join(lead, "lead");
    group.join(phone, "follow");
    lead.start(0);
    phone.start(0);
    lead.currentTime = 5;
    phone.currentTime = 6.5;
    lead.emit("timeupdate");
    expect(phone.currentTime).toBeCloseTo(5);
    expect(phone.playbackRate).toBe(1);
  });

  test("eases a follower that is more than half a frame off back into step without a jump", () => {
    const group = new PlaybackGroup();
    const lead = new FakeClip(10);
    const phone = new FakeClip(10);
    group.join(lead, "lead");
    group.join(phone, "follow");
    lead.start(0);
    phone.start(0);
    lead.currentTime = 5;
    phone.currentTime = 5.15;
    lead.emit("timeupdate");
    expect(phone.currentTime).toBeCloseTo(5.15);
    expect(phone.playbackRate).toBeLessThan(1);
    phone.currentTime = 4.85;
    lead.emit("timeupdate");
    expect(phone.playbackRate).toBeGreaterThan(1);
    phone.currentTime = 5.025;
    lead.emit("timeupdate");
    expect(phone.playbackRate).toBeLessThan(1);
    phone.currentTime = 5.01;
    lead.emit("timeupdate");
    expect(phone.playbackRate).toBe(1);
  });

  test("eases rather than jumps from half a second off, since a jump stalls while it decodes", () => {
    const group = new PlaybackGroup();
    const lead = new FakeClip(10);
    const phone = new FakeClip(10);
    group.join(lead, "lead");
    group.join(phone, "follow");
    lead.start(5);
    phone.start(4.5);
    expect(phone.currentTime).toBeCloseTo(4.5);
    expect(phone.playbackRate).toBeGreaterThan(1);
  });

  test("returns followers to normal speed when the lead pauses", () => {
    const group = new PlaybackGroup();
    const lead = new FakeClip(10);
    const phone = new FakeClip(10);
    group.join(lead, "lead");
    group.join(phone, "follow");
    lead.start(5);
    phone.start(5.15);
    lead.paused = true;
    lead.emit("pause");
    expect(phone.playbackRate).toBe(1);
  });

  test("leaves clips of different lengths alone, since they cannot share a loop", () => {
    const group = new PlaybackGroup();
    const lead = new FakeClip(10);
    const phone = new FakeClip(7);
    group.join(lead, "lead");
    group.join(phone, "follow");
    lead.start(3);
    phone.start(1);
    lead.emit("timeupdate");
    expect(phone.currentTime).toBeCloseTo(1);
    expect(phone.playbackRate).toBe(1);
  });

  test("does not move a paused follower", () => {
    const group = new PlaybackGroup();
    const lead = new FakeClip(10);
    const phone = new FakeClip(10);
    group.join(lead, "lead");
    group.join(phone, "follow");
    lead.start(6);
    phone.currentTime = 1;
    lead.emit("timeupdate");
    expect(phone.currentTime).toBeCloseTo(1);
  });

  test("stops listening once a clip leaves, at normal speed", () => {
    const group = new PlaybackGroup();
    const lead = new FakeClip(10);
    const phone = new FakeClip(10);
    const leaveLead = group.join(lead, "lead");
    const leavePhone = group.join(phone, "follow");
    lead.start(5);
    phone.start(5.15);
    leavePhone();
    expect(phone.playbackRate).toBe(1);
    leaveLead();
    expect([...lead.listeners.values()].every((set) => set.size === 0)).toBe(
      true,
    );
    expect([...phone.listeners.values()].every((set) => set.size === 0)).toBe(
      true,
    );
  });
});
