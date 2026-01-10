"use client";

import Image from "next/image";
import { useState } from "react";

const faviconCache: Record<string, string> = {};

async function createCircularFavicon(src: string): Promise<string> {
  if (faviconCache[src]) return faviconCache[src];

  const img = new window.Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });

  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Circular clip
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, 0, 0, size, size);

  const dataUrl = canvas.toDataURL("image/png");
  faviconCache[src] = dataUrl;
  return dataUrl;
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

function updateFavicon(src: string) {
  void createCircularFavicon(src).then(setFavicon);
}

export function Avatar() {
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseEnter() {
    setIsHovered(true);
    updateFavicon("/avatar.png");
    // Preload the other image for smooth transition back
    void createCircularFavicon("/pfp.png");
  }

  function handleMouseLeave() {
    setIsHovered(false);
    updateFavicon("/pfp.png");
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
