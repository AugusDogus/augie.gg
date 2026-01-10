"use client";

import Image from "next/image";
import { useState } from "react";

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function Avatar() {
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseEnter() {
    setIsHovered(true);
    setFavicon("/avatar.png");
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setFavicon("/pfp.png");
  }

  return (
    <div
      className="group relative size-24"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Front - Real photo */}
      <Image
        src="/pfp.png"
        alt="Augie Luebbers"
        width={96}
        height={96}
        className={`ring-border absolute inset-0 size-full rounded-full object-cover ring-2 transition-all duration-500 ${
          isHovered ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        priority
      />

      {/* Back - Avatar (dissolves in) */}
      <Image
        src="/avatar.png"
        alt="Augie's avatar"
        width={96}
        height={96}
        className={`ring-border absolute inset-0 size-full rounded-full object-cover ring-2 transition-all duration-500 ${
          isHovered ? "scale-100 opacity-100" : "scale-105 opacity-0"
        }`}
      />

      {/* Subtle glow on hover */}
      <div
        className={`absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.3)_0%,transparent_70%)] blur-sm transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
