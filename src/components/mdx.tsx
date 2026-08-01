import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { highlight } from "sugar-high";

type AnchorProps = ComponentPropsWithoutRef<"a">;
type CodeProps = ComponentPropsWithoutRef<"code">;

/**
 * MDX link with the site's routing conventions: internal links go through
 * next/link, fragments stay plain, everything else opens in a new tab.
 * The className carries the whole look so each document can restyle links.
 */
export function createMdxAnchor(className: string) {
  function MdxAnchor({ href, children, ...props }: AnchorProps) {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className={className} {...props}>
          {children}
        </Link>
      );
    }
    if (href?.startsWith("#")) {
      return (
        <a href={href} className={className} {...props}>
          {children}
        </a>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...props}
      >
        {children}
      </a>
    );
  }
  return MdxAnchor;
}

/**
 * Inline code, run through sugar-high and then flattened back to a single
 * color: the span rules override sugar-high's inline token colors (inline
 * styles need `!important` to beat).
 */
export function createMdxCode(className: string) {
  function MdxCode({ children, ...props }: CodeProps) {
    return (
      <code
        className={className}
        dangerouslySetInnerHTML={{ __html: highlight(children as string) }}
        {...props}
      />
    );
  }
  return MdxCode;
}
