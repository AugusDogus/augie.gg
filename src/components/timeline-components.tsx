import type { ComponentPropsWithoutRef } from "react";
import { createMdxAnchor, createMdxCode } from "~/components/mdx";

/**
 * Overrides for src/content/timeline.mdx, passed to the MDX component in
 * app/page.tsx. They flatten the default MDX styles into a ledger: quiet
 * year headings, bare links, and label chips instead of inline-code pills.
 */
export const timelineComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="text-muted-foreground/50 mb-3 text-xs font-normal tracking-[0.1em] text-balance not-first:mt-6"
      {...props}
    />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p
      className="text-muted-foreground mb-3 text-sm leading-normal"
      {...props}
    />
  ),
  a: createMdxAnchor(
    "text-foreground no-underline transition-colors hover:text-primary md:text-base",
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="text-foreground font-normal md:text-base" {...props} />
  ),
  code: createMdxCode(
    "text-muted-foreground/40 bg-transparent p-0 font-sans text-[10px] tracking-[0.05em] uppercase [&_span]:font-normal [&_span]:text-inherit!",
  ),
};
