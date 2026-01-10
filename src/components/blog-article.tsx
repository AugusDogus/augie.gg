"use client";

import { useRef, useState, useEffect } from "react";
import { ReadingProgress } from "./reading-progress";
import { calculateReadingTime } from "~/lib/blog";

interface BlogArticleProps {
  children: React.ReactNode;
}

export function BlogArticle({ children }: BlogArticleProps) {
  const articleRef = useRef<HTMLElement>(null);
  const [readingTime, setReadingTime] = useState<number | null>(null);

  useEffect(() => {
    // Extract text content from rendered MDX for reading time calculation
    if (articleRef.current) {
      const textContent = articleRef.current.textContent ?? "";
      setReadingTime(calculateReadingTime(textContent));
    }
  }, [children]);

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
