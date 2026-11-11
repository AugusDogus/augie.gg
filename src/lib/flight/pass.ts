import { Haze } from "./art-maps";
import { POD, Pod, STEP } from "./pod";
import { smoothstep } from "./streams";

/**
 * One pass of the mother and calf across the painting, which a recording can
 * loop: for a moment between passes neither shows, the calf gone off the
 * right and the mother not yet through the cloud at the left, so the end of
 * one pass can meet the start of it with no whale in two places. The drift
 * whale keeps the mother's time and is back where it was; only the far whale
 * keeps its own.
 */
export type Pass = {
  /** When the mother is sent back upstream, in seconds after t = 0. */
  start: number;
  /** How long until she next is. */
  seconds: number;
  /** How long after either of those no part of her or the calf shows. */
  clear: number;
  /** How far in her nose is where the site first shows it. */
  opening: number;
};

/** A pass in frames of a recording. */
export type PassFrames = {
  /** Frames from t = 0 to the first of the pass. */
  skip: number;
  pass: number;
  /** Frames past the pass's end that dissolve into its first. */
  dissolve: number;
  /** The frame of the pass a recording opens on. */
  opening: number;
};

/** The mother's first return follows a pass the drift whale joined uncued, so the pass after her second is the first to repeat. */
const RETURN = 2;
/** A pass takes about half a minute; the third return is due well inside this. */
const SEARCH_SECONDS = 600;

export const Pass = {
  /** The first pass that repeats, found by running the pod with no visitor. */
  find(): Pass {
    const pod = new Pod(Haze.flat(0.5, 0.5, 0.5));
    const { under } = pod.streams;
    const gate = under.gate?.[0] ?? -Infinity;
    const opens = under.route.arcAtX(POD.hero.startX);
    let start: number | null = null,
      end: number | null = null,
      opening: number | null = null,
      returned: number | null = null,
      clear = Infinity;
    while (pod.time < SEARCH_SECONDS) {
      const cycle = pod.hero.cycle;
      pod.step(STEP);
      if (pod.hero.cycle !== cycle && pod.hero.cycle >= RETURN) {
        if (start === null) start = pod.time;
        else end = pod.time;
        returned = pod.time;
      }
      if (start === null) continue;
      if (returned !== null && pod.hero.s >= gate) {
        clear = Math.min(clear, pod.time - returned);
        returned = null;
        if (end !== null && opening !== null)
          return { start, seconds: end - start, clear, opening };
      }
      if (opening === null && pod.hero.s >= opens) opening = pod.time - start;
    }
    throw new Error(
      `The mother did not make a whole pass after her return ${RETURN} within ${SEARCH_SECONDS} s of simulation. The pod's model (pod.ts, POD) must have changed how she re-enters.`,
    );
  },

  /**
   * The pass at `fps`, with `dissolve` seconds past its end to dissolve into
   * its start. Throws when that dissolve would outlast the time neither the
   * mother nor the calf shows.
   */
  frames(pass: Pass, fps: number, dissolve: number): PassFrames {
    // The first frame at or after her return, whatever the product rounds to.
    const skip = Math.ceil(pass.start * fps - 1e-6);
    const frames = {
      skip,
      pass: Math.ceil(pass.seconds * fps),
      dissolve: Math.round(dissolve * fps),
      opening: Math.round(pass.opening * fps),
    };
    const late = (skip + frames.dissolve) / fps - pass.start;
    const later =
      (skip + frames.pass + frames.dissolve) / fps - pass.start - pass.seconds;
    if (Math.max(late, later) >= pass.clear)
      throw new Error(
        `A dissolve of ${dissolve} s would still be running ${Math.max(late, later).toFixed(2)} s after the mother's return, and she shows after ${pass.clear.toFixed(2)} s. Shorten the dissolve.`,
      );
    return frames;
  },

  /**
   * How much of the far whale shows on `frame` of a recorded pass, 0 to 1:
   * nothing during the dissolve at either end, with `fade` frames to come in
   * after the first and go out before the last, as it does at the ends of its
   * own pass.
   */
  far(
    frames: Pick<PassFrames, "pass" | "dissolve">,
    frame: number,
    fade: number,
  ): number {
    return (
      smoothstep(frames.dissolve, frames.dissolve + fade, frame) *
      (1 - smoothstep(frames.pass - fade, frames.pass, frame))
    );
  },
} as const;
