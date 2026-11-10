/**
 * The Twitch subscription to Theo's channel. Twitch has no public count, so
 * it runs forward from one read off the anniversary notice: 54 months on
 * November 9, 2026. Move the anchor if the subscription ever lapses.
 */
const ANCHOR = { months: 54, year: 2026, month: 11, day: 9 } as const;

export const TwitchSub = {
  /** Months subscribed as of `now`, a month added on each anniversary day (UTC). */
  months(now: Date): number {
    const elapsed =
      (now.getUTCFullYear() - ANCHOR.year) * 12 +
      (now.getUTCMonth() + 1 - ANCHOR.month) -
      (now.getUTCDate() < ANCHOR.day ? 1 : 0);
    return ANCHOR.months + Math.max(0, elapsed);
  },
} as const;
