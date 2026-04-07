"use client";

import { useEffect, useRef, useState } from "react";
import { AgeCounter } from "~/components/age-counter";
import { Avatar } from "~/components/avatar";

const REAL_NAME = "Augie Luebbers";
const HANDLE = "@AugusDogus";
const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const WIDEST_NAME = REAL_NAME.length >= HANDLE.length ? REAL_NAME : HANDLE;
const SCRAMBLE_DURATION_MS = 500;
const SCRAMBLE_INTERVAL_MS = 40;

function getRandomScrambleChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

export function Hero() {
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [displayName, setDisplayName] = useState(REAL_NAME);
  const timeoutRef = useRef<number | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const target = isAvatarHovered ? HANDLE : REAL_NAME;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setDisplayName(target);
      return;
    }

    const totalSteps = Math.max(
      1,
      Math.round(SCRAMBLE_DURATION_MS / SCRAMBLE_INTERVAL_MS),
    );
    let step = 0;

    const tick = () => {
      step += 1;
      const progress = step / totalSteps;
      const revealCount = Math.floor(target.length * progress);

      if (step >= totalSteps) {
        setDisplayName(target);
        timeoutRef.current = null;
        return;
      }

      setDisplayName(
        target
          .split("")
          .map((char, index) => {
            if (char === " ") {
              return " ";
            }

            return index < revealCount ? char : getRandomScrambleChar();
          })
          .join(""),
      );

      timeoutRef.current = window.setTimeout(tick, SCRAMBLE_INTERVAL_MS);
    };

    tick();

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAvatarHovered]);

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-center gap-4 md:gap-6">
        <Avatar
          isHovered={isAvatarHovered}
          onHoverChange={setIsAvatarHovered}
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            <span className="sr-only">{isAvatarHovered ? HANDLE : REAL_NAME}</span>
            <span aria-hidden="true" className="inline-grid">
              <span className="invisible col-start-1 row-start-1">
                {WIDEST_NAME}
              </span>
              <span className="col-start-1 row-start-1">{displayName}</span>
            </span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            <AgeCounter />
          </p>
        </div>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed text-pretty md:text-base">
        Full-stack developer based in Pensacola, FL. Currently building modern
        web experiences at{" "}
        <a
          href="https://www.amli.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:text-primary underline underline-offset-4 transition-colors"
        >
          AMLI Residential
        </a>
        . Passionate about TypeScript, React, Next.js, and developer tooling.
      </p>
    </section>
  );
}
