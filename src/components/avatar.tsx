"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_APP_TITLE, HOVER_APP_TITLE } from "~/lib/site";

type AvatarProps = {
  isHovered?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
};

const DEFAULT_FAVICON = "/pfp.png";
const HOVER_FAVICON = "/avatar.png";

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function Avatar({
  isHovered: controlledIsHovered,
  onHoverChange,
}: AvatarProps) {
  const [uncontrolledIsHovered, setUncontrolledIsHovered] = useState(false);
  const originalTitleRef = useRef<string | null>(null);
  const isHovered = controlledIsHovered ?? uncontrolledIsHovered;

  function updateHoverState(nextIsHovered: boolean) {
    setUncontrolledIsHovered(nextIsHovered);
    onHoverChange?.(nextIsHovered);
  }

  function handleMouseEnter() {
    updateHoverState(true);
    originalTitleRef.current ??= document.title || DEFAULT_APP_TITLE;
    document.title = HOVER_APP_TITLE;
    setFavicon(HOVER_FAVICON);
  }

  function handleMouseLeave() {
    updateHoverState(false);
    document.title = originalTitleRef.current ?? DEFAULT_APP_TITLE;
    originalTitleRef.current = null;
    setFavicon(DEFAULT_FAVICON);
  }

  useEffect(() => {
    return () => {
      document.title = originalTitleRef.current ?? DEFAULT_APP_TITLE;
      setFavicon(DEFAULT_FAVICON);
    };
  }, []);

  return (
    <div
      className="group relative size-16 md:size-24"
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
