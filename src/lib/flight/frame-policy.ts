export type FrameCap = 60 | 30;

/** Minimum ms between rendered frames. Below 1000/cap so rAF jitter cannot skip a vsync. */
const MIN_GAP: Readonly<Record<FrameCap, number>> = { 60: 12.5, 30: 30 };
const MAX_DT = 0.06;
const SMOOTHING = 0.1;
const WARM_UP = 3000;
const SLOW_GAP = 24;
const SLOW_FOR = 2000;

type Run = {
  started: number;
  last: number;
  /** EMA of rendered gaps, ms. */
  average: number | null;
  slowSince: number | null;
};

/** Paces rAF ticks to a frame cap and drops to 30 fps for good if 60 cannot be held. */
export class FramePolicy {
  /** Seconds since the last rendered frame, clamped; 0 on the first frame after reset(). */
  dt = 0;
  /** The same gap unclamped, for measuring real input speeds across a stall. */
  gap = 0;
  private current: FrameCap;
  private run: Run | null = null;

  constructor(cap: FrameCap) {
    this.current = cap;
  }

  get cap(): FrameCap {
    return this.current;
  }

  /** Whether to render on the rAF tick at `now` ms. */
  ready(now: number): boolean {
    const run = this.run;
    if (!run) {
      this.run = { started: now, last: now, average: null, slowSince: null };
      this.dt = 0;
      this.gap = 0;
      return true;
    }
    const gap = now - run.last;
    if (gap < MIN_GAP[this.current]) return false;
    run.last = now;
    this.gap = gap / 1000;
    this.dt = Math.min(this.gap, MAX_DT);
    run.average =
      run.average === null
        ? gap
        : run.average + (gap - run.average) * SMOOTHING;
    if (this.current === 60 && now - run.started >= WARM_UP) {
      if (run.average <= SLOW_GAP) run.slowSince = null;
      else if (run.slowSince === null) run.slowSince = now;
      else if (now - run.slowSince >= SLOW_FOR) this.current = 30;
    }
    return true;
  }

  /** Restart pacing after a pause, resume or visibility change. The cap is kept. */
  reset() {
    this.run = null;
  }
}
