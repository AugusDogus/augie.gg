import type { Pointer } from "./flow";
import type { Point } from "./route";
import { toPainting } from "./viewport";

/** Where the visitor's pointer is, in painting px; velocities in painting px/s. */
export type Hand =
  | { kind: "away" }
  | { kind: "hover"; x: number; y: number; vx: number; vy: number }
  | {
      kind: "press";
      x: number;
      y: number;
      vx: number;
      vy: number;
      /** Seconds the press has been held. */
      since: number;
      origin: Point;
    };
/** Discrete gestures, applied once on the next simulation tick. */
export type Gesture =
  | { kind: "tap"; x: number; y: number }
  | { kind: "release"; x: number; y: number };
/** One frame of input, held for every fixed tick in that frame. */
export type Sense = {
  hand: Hand;
  previous: Hand;
  gestures: readonly Gesture[];
};

export const AWAY: Hand = { kind: "away" };
/** No input at all; the scene must behave exactly as it does without a visitor. */
export const STILL: Sense = { hand: AWAY, previous: AWAY, gestures: [] };

export type PointerKind = "mouse" | "pen" | "touch";
/** A tap travels at most this many client px and lasts at most this many ms. */
export const TAP = { travel: 10, duration: 300 } as const;
/** Velocity EMA time constant, s. */
const SMOOTHING = 0.06;
const NONE: readonly Gesture[] = [];

/** A hovering or pressing mouse or pen, in display-art units. */
type Contact =
  | { kind: "away" }
  | { kind: "hover"; x01: number; y01: number }
  | { kind: "press"; x01: number; y01: number; origin: Point };
type Pending = { clientX: number; clientY: number; at: number };
const GONE: Contact = { kind: "away" };
const inside = (x01: number, y01: number) =>
  x01 >= 0 && x01 <= 1 && y01 >= 0 && y01 <= 1;

/** Turns pointer events into a per-frame Sense. DOM-free: the caller resolves targets and art units. */
export class Instrument {
  private contact: Contact = GONE;
  private tap: Pending | null = null;
  private gestures: Gesture[] = [];
  private previous: Hand = AWAY;
  private sampled: { x: number; y: number } | null = null;
  private vx = 0;
  private vy = 0;
  private held = 0;
  private readonly legacy: Pointer = { x: 0.5, y: 0.5, active: false };

  /** x01, y01: display-art units. blocked: over button, a, input or .material. now: ms. */
  move(
    x01: number,
    y01: number,
    kind: PointerKind,
    blocked: boolean,
    now: number,
  ) {
    if (this.tap && now - this.tap.at > TAP.duration) this.tap = null;
    if (kind === "touch") return;
    if (blocked || !inside(x01, y01)) this.contact = GONE;
    else if (this.contact.kind === "press")
      this.contact = { ...this.contact, x01, y01 };
    else this.contact = { kind: "hover", x01, y01 };
  }

  down(
    x01: number,
    y01: number,
    kind: PointerKind,
    blocked: boolean,
    clientX: number,
    clientY: number,
    now: number,
  ) {
    if (blocked || !inside(x01, y01)) {
      this.tap = null;
      if (kind !== "touch") this.contact = GONE;
      return;
    }
    this.tap = { clientX, clientY, at: now };
    if (kind === "touch") return;
    const { x, y } = toPainting(x01, y01);
    this.contact = { kind: "press", x01, y01, origin: [x, y] };
    this.held = 0;
  }

  up(
    x01: number,
    y01: number,
    kind: PointerKind,
    clientX: number,
    clientY: number,
    now: number,
  ) {
    const tap = this.tap;
    this.tap = null;
    const pressed = kind !== "touch" && this.contact.kind === "press";
    const { x, y } = toPainting(x01, y01);
    if (
      tap &&
      inside(x01, y01) &&
      Math.hypot(clientX - tap.clientX, clientY - tap.clientY) <= TAP.travel &&
      now - tap.at <= TAP.duration
    )
      this.gestures.push({ kind: "tap", x, y });
    else if (pressed) this.gestures.push({ kind: "release", x, y });
    if (kind !== "touch")
      this.contact = inside(x01, y01) ? { kind: "hover", x01, y01 } : GONE;
  }

  /** pointercancel or scroll: aborts a pending tap and any press. */
  cancel() {
    this.tap = null;
    if (this.contact.kind === "press") this.contact = GONE;
  }

  /** The pointer left the document or the window lost focus. */
  leave() {
    this.tap = null;
    this.contact = GONE;
  }

  /** Pause, hidden tab or sync: the hand goes away and pending gestures are dropped. */
  clear() {
    this.leave();
    this.gestures = [];
    this.previous = AWAY;
    this.sampled = null;
    this.vx = 0;
    this.vy = 0;
  }

  /** Advances the velocity estimate and returns this frame's Sense; gestures are returned once. */
  frame(dt: number): Sense {
    const contact = this.contact;
    let hand: Hand = AWAY;
    if (contact.kind === "away") {
      this.sampled = null;
      this.vx = 0;
      this.vy = 0;
    } else {
      const { x, y } = toPainting(contact.x01, contact.y01);
      if (!this.sampled) {
        this.vx = 0;
        this.vy = 0;
      } else if (dt > 0) {
        const k = 1 - Math.exp(-dt / SMOOTHING);
        this.vx += ((x - this.sampled.x) / dt - this.vx) * k;
        this.vy += ((y - this.sampled.y) / dt - this.vy) * k;
      }
      this.sampled = { x, y };
      const { vx, vy } = this;
      if (contact.kind === "press") {
        hand = {
          kind: "press",
          x,
          y,
          vx,
          vy,
          since: this.held,
          origin: contact.origin,
        };
        this.held += dt;
      } else hand = { kind: "hover", x, y, vx, vy };
    }
    const sense: Sense = {
      hand,
      previous: this.previous,
      gestures: this.gestures.length > 0 ? this.gestures : NONE,
    };
    if (this.gestures.length > 0) this.gestures = [];
    this.previous = hand;
    return sense;
  }

  /** Legacy pointer for Flow and Specks: display-art units, active for a hovering or pressing mouse or pen. */
  get pointer(): Pointer {
    const contact = this.contact;
    this.legacy.active = contact.kind !== "away";
    if (contact.kind !== "away") {
      this.legacy.x = contact.x01;
      this.legacy.y = contact.y01;
    }
    return this.legacy;
  }
}
