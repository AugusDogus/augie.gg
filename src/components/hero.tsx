"use client";

import { useState } from "react";
import { AgeCounter } from "~/components/age-counter";
import { Avatar } from "~/components/avatar";
import { ScrambleText } from "~/components/scramble-text";

const REAL_NAME = "Augie Luebbers";
const HANDLE = "@AugusDogus";
const WIDEST_NAME = REAL_NAME.length >= HANDLE.length ? REAL_NAME : HANDLE;

export function Hero() {
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-center gap-4 md:gap-6">
        <Avatar
          isHovered={isAvatarHovered}
          onHoverChange={setIsAvatarHovered}
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            <ScrambleText
              text={isAvatarHovered ? HANDLE : REAL_NAME}
              durationMs={500}
              intervalMs={40}
              reserveSpaceWith={WIDEST_NAME}
            />
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
