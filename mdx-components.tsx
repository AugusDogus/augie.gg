import type { MDXComponents } from "mdx/types";
import { createMdxAnchor, createMdxCode } from "~/components/mdx";
const defaultComponents = {
  a: createMdxAnchor("underline underline-offset-4"),
  code: createMdxCode("font-mono text-[.9em]"),
} satisfies MDXComponents;
export function useMDXComponents(): MDXComponents {
  return defaultComponents;
}
