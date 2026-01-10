"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { ReadingProgress } from "./reading-progress";
import { calculateReadingTime } from "~/lib/reading-time";

interface BlogArticleProps {
  children: React.ReactNode;
}

export function BlogArticle({ children }: BlogArticleProps) {
  const articleRef = useRef<HTMLElement>(null);
  const [readingTime, setReadingTime] = useState<number | null>(null);

  // Read from DOM after render - valid Effect for external system sync
  useLayoutEffect(() => {
    if (articleRef.current) {
      const text = articleRef.current.textContent ?? "";
      setReadingTime(calculateReadingTime(text));
    }
  }, []);

  return (
    <>
      <ReadingProgress contentRef={articleRef} />
      <article ref={articleRef} className="space-y-4">
        {readingTime !== null && (
          <p className="text-muted-foreground -mt-4 text-sm">
            {readingTime} min read
          </p>
        )}
        {children}
      </article>
    </>
  );
}
