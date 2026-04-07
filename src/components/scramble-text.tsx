"use client";

import { useEffect, useRef, useState } from "react";

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

type ScrambleTextProps = {
  text: string;
  durationMs?: number;
  intervalMs?: number;
  reserveSpaceWith?: string;
};

function getRandomScrambleChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

export function ScrambleText({
  text,
  durationMs = 500,
  intervalMs = 40,
  reserveSpaceWith,
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const timeoutRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setDisplayText(text);
      return;
    }

    const totalSteps = Math.max(1, Math.round(durationMs / intervalMs));
    let step = 0;

    const tick = () => {
      step += 1;
      const progress = step / totalSteps;
      const revealCount = Math.floor(text.length * progress);

      if (step >= totalSteps) {
        setDisplayText(text);
        timeoutRef.current = null;
        return;
      }

      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") {
              return " ";
            }

            return index < revealCount ? char : getRandomScrambleChar();
          })
          .join(""),
      );

      timeoutRef.current = window.setTimeout(tick, intervalMs);
    };

    tick();

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [durationMs, intervalMs, text]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-grid">
        {reserveSpaceWith ? (
          <span className="invisible col-start-1 row-start-1">
            {reserveSpaceWith}
          </span>
        ) : null}
        <span className="col-start-1 row-start-1">{displayText}</span>
      </span>
    </>
  );
}
