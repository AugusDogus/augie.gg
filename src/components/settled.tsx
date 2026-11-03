"use client";

import { useEffect } from "react";

/** The entrance plays once per visit; client-side returns to home land already settled. */
export function Settled() {
  useEffect(() => {
    const timer = setTimeout(() => {
      document.documentElement.dataset.settled = "";
    }, 1400);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
