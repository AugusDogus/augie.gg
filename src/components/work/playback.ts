/** The part of a video element that keeping clips in step touches. */
export type Clip = {
  currentTime: number;
  playbackRate: number;
  readonly duration: number;
  readonly paused: boolean;
  addEventListener(
    type: "playing" | "pause" | "timeupdate",
    listener: () => void,
  ): void;
  removeEventListener(
    type: "playing" | "pause" | "timeupdate",
    listener: () => void,
  ): void;
};

/** The clip that keeps time, or one that keeps to it. */
export type Role = "lead" | "follow";

/** Within half a frame, at the captures' 30 fps, counts as in step: both show the same frame. */
const IN_STEP = 1 / 60;
/**
 * Past this a follower jumps to the lead; short of it, it eases back by speed
 * alone, which never shows. A jump stalls while the follower decodes from a
 * keyframe, a few hundred milliseconds on a slow phone, so a threshold under
 * that stall would keep jumping.
 */
const JUMP_PAST = 1;
/** The most a follower's speed moves off normal while it eases back. */
const MAX_EASE = 0.2;
/** Clips this close in length loop together; longer gaps mean they were never cut to one timeline. */
const SAME_LENGTH = 0.1;

export const Playback = {
  /** How far a looping follower runs ahead of the lead, the short way round the loop. */
  drift(lead: number, follower: number, duration: number): number {
    const half = duration / 2;
    return (
      ((((follower - lead + half) % duration) + duration) % duration) - half
    );
  },

  /** The speed that brings a follower `drift` seconds ahead back in step within about a second. */
  rate(drift: number): number {
    if (Math.abs(drift) <= IN_STEP) return 1;
    return 1 - Math.max(-MAX_EASE, Math.min(MAX_EASE, drift));
  },
} as const;

/**
 * Captures cut to one timeline and shown side by side, such as a desktop video
 * with its phone inset: each loops on its own, so the followers keep to the
 * lead's clock, starting where it is and easing back whenever they drift.
 */
export class PlaybackGroup {
  #lead: Clip | null = null;
  readonly #followers = new Set<Clip>();

  /** Adds a clip; the returned function takes it out again. */
  join(clip: Clip, role: Role): () => void {
    return role === "lead" ? this.#joinLead(clip) : this.#joinFollower(clip);
  }

  #joinLead(clip: Clip): () => void {
    const align = () => {
      for (const follower of this.#followers) this.#align(follower);
    };
    const release = () => {
      for (const follower of this.#followers) follower.playbackRate = 1;
    };
    this.#lead = clip;
    clip.addEventListener("playing", align);
    clip.addEventListener("timeupdate", align);
    clip.addEventListener("pause", release);
    return () => {
      clip.removeEventListener("playing", align);
      clip.removeEventListener("timeupdate", align);
      clip.removeEventListener("pause", release);
      if (this.#lead === clip) this.#lead = null;
      release();
    };
  }

  #joinFollower(clip: Clip): () => void {
    const align = () => this.#align(clip);
    this.#followers.add(clip);
    clip.addEventListener("playing", align);
    return () => {
      clip.removeEventListener("playing", align);
      this.#followers.delete(clip);
      clip.playbackRate = 1;
    };
  }

  #align(follower: Clip) {
    const lead = this.#lead;
    if (lead === null || lead.paused || follower.paused) return;
    // Also false while either length is unknown (NaN).
    if (!(Math.abs(lead.duration - follower.duration) <= SAME_LENGTH)) return;
    const drift = Playback.drift(
      lead.currentTime,
      follower.currentTime,
      lead.duration,
    );
    if (Math.abs(drift) > JUMP_PAST) {
      follower.currentTime = lead.currentTime;
      follower.playbackRate = 1;
      return;
    }
    follower.playbackRate = Playback.rate(drift);
  }
}
