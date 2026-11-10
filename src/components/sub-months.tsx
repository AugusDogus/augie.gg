"use client";

import { useSyncExternalStore } from "react";
import { TwitchSub } from "~/lib/twitch-sub";

const subscribe = () => () => {};

/**
 * Months subscribed to Theo on Twitch. The page is static, so `initial` is the
 * count at build time (what prints and what shows without JavaScript), and the
 * visitor's clock corrects it once the page hydrates.
 */
export function SubMonths({ initial }: { initial: number }) {
  return useSyncExternalStore(
    subscribe,
    () => TwitchSub.months(new Date()),
    () => initial,
  );
}
