"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

interface ReadingProgressProps {
  contentRef: React.RefObject<HTMLElement | null>;
}

export function ReadingProgress({ contentRef }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const rafRef = useRef<number>(0);
  const pathname = usePathname();

  const calculateProgress = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const rect = content.getBoundingClientRect();
    const contentHeight = content.scrollHeight;
    const viewportHeight = window.innerHeight;

    // Calculate how much of the content has been scrolled past
    const scrolledPast = -rect.top;
    const scrollableDistance = contentHeight - viewportHeight;

    // Handle short posts where content fits in viewport
    if (scrollableDistance <= 0) {
      setProgress(100);
      setIsVisible(true);
      return;
    }

    // Calculate progress as percentage
    const currentProgress = Math.min(
      100,
      Math.max(0, (scrolledPast / scrollableDistance) * 100)
    );

    setProgress(currentProgress);
    setIsVisible(scrolledPast > 0);
  }, [contentRef]);

  useEffect(() => {
    // Reset on route change
    setProgress(0);
    setIsVisible(false);
  }, [pathname]);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const handleScroll = () => {
      if (prefersReducedMotion) {
        // Update immediately without RAF for reduced motion
        calculateProgress();
      } else {
        // Use RAF for smooth updates
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(calculateProgress);
      }
    };

    // Initial calculation
    calculateProgress();

    // Set up listeners
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    // Handle dynamic content changes with ResizeObserver
    const content = contentRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (content) {
      resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(content);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      resizeObserver?.disconnect();
    };
  }, [calculateProgress, contentRef]);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
      className="fixed top-0 left-0 z-50 h-0.5 w-full"
    >
      <div
        className="bg-primary h-full origin-left transition-opacity duration-300"
        style={{
          transform: `scaleX(${progress / 100})`,
          opacity: isVisible ? 1 : 0,
        }}
      />
    </div>
  );
}
