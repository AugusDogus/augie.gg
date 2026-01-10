"use client";

import { useRef } from "react";
import { ReadingProgress } from "./reading-progress";

interface BlogArticleProps {
  children: React.ReactNode;
}

export function BlogArticle({ children }: BlogArticleProps) {
  const articleRef = useRef<HTMLElement>(null);

  return (
    <>
      <ReadingProgress contentRef={articleRef} />
      <article ref={articleRef} className="space-y-4">
        {children}
      </article>
    </>
  );
}
