"use client";

import { useEffect, useRef } from "react";

const BIRTHDAY_ISO = "1998-11-19T00:00:00";
const BIRTHDAY = new Date(BIRTHDAY_ISO);

function calculateAge(): number {
  const now = new Date();
  const diffMs = now.getTime() - BIRTHDAY.getTime();
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  return diffMs / msPerYear;
}

declare global {
  interface Window {
    __AGE_VALUE__?: string;
  }
}

const isBrowser = typeof window !== "undefined";

/**
 * Inline script that:
 * 1. Calculates the current age
 * 2. Updates the DOM element with the age
 * 3. Stores the formatted string in window.__AGE_VALUE__ for React to read during hydration
 * 4. Removes itself so React doesn't see a mismatch
 *
 * This ensures React hydrates with the exact same string that's in the DOM.
 * See: https://dev.to/sidmohanty11/how-to-fix-react-hydration-mismatches-with-a-simple-inline-script-hack-zero-flicker-ssr-44fi
 */
const inlineScript =
  "(function(){" +
  'var BIRTHDAY=new Date("' +
  BIRTHDAY_ISO +
  '").getTime();' +
  "var MS_PER_YEAR=1000*60*60*24*365.25;" +
  "var age=(Date.now()-BIRTHDAY)/MS_PER_YEAR;" +
  'var str=age.toFixed(9)+" years old";' +
  "window.__AGE_VALUE__=str;" +
  'var el=document.getElementById("age-counter");' +
  "if(el)el.textContent=str;" +
  "document.currentScript.remove();" +
  "})();";

function formatAge(age: number): string {
  return `${age.toFixed(9)} years old`;
}

export function AgeCounter() {
  const ref = useRef<HTMLSpanElement>(null);

  // On client, read the value the inline script calculated and stored.
  // On server, calculate the age directly (it's just math, no browser APIs).
  const initialValue =
    isBrowser && window.__AGE_VALUE__
      ? window.__AGE_VALUE__
      : formatAge(calculateAge());

  useEffect(() => {
    const update = () => {
      if (ref.current) {
        ref.current.textContent = `${calculateAge().toFixed(9)} years old`;
      }
    };

    const interval = setInterval(update, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <span
        ref={ref}
        id="age-counter"
        className="text-muted-foreground tabular-nums"
      >
        {initialValue}
      </span>
      {/* Only render script on server - it removes itself before React hydrates */}
      {!isBrowser && (
        <script dangerouslySetInnerHTML={{ __html: inlineScript }} />
      )}
    </>
  );
}
