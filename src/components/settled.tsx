"use client";

import { useEffect } from "react";

/**
 * The entrance plays once per visit, on whichever page it starts: home
 * reached later, from the résumé or back again, lands already settled, so
 * nothing rises under the name as it travels (NameHeading).
 */
export function Settled() {
  useEffect(() => {
    const timer = setTimeout(() => {
      document.documentElement.dataset.settled = "";
    }, 1400);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
