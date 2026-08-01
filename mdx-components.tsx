import type { ComponentPropsWithoutRef } from "react";
import { createMdxAnchor, createMdxCode } from "~/components/mdx";

type HeadingProps = ComponentPropsWithoutRef<"h1">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;
type ListProps = ComponentPropsWithoutRef<"ul">;
type ListItemProps = ComponentPropsWithoutRef<"li">;
type BlockquoteProps = ComponentPropsWithoutRef<"blockquote">;

const defaultComponents = {
  h1: (props: HeadingProps) => (
    <h1 className="mb-0 pt-2 pb-6 font-medium text-balance" {...props} />
  ),
  h2: (props: HeadingProps) => (
    <h2
      className="text-foreground mt-8 mb-3 font-medium text-balance"
      {...props}
    />
  ),
  h3: (props: HeadingProps) => (
    <h3
      className="text-foreground mt-8 mb-3 font-medium text-balance"
      {...props}
    />
  ),
  h4: (props: HeadingProps) => (
    <h4 className="font-medium text-balance" {...props} />
  ),
  p: (props: ParagraphProps) => (
    <p className="text-muted-foreground leading-relaxed" {...props} />
  ),
  ol: (props: ListProps) => (
    <ol
      className="text-muted-foreground list-decimal space-y-2 pl-5"
      {...props}
    />
  ),
  ul: (props: ListProps) => (
    <ul className="text-muted-foreground list-disc space-y-1 pl-5" {...props} />
  ),
  li: (props: ListItemProps) => <li className="pl-1" {...props} />,
  em: (props: ComponentPropsWithoutRef<"em">) => (
    <em className="font-medium" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-medium" {...props} />
  ),
  a: createMdxAnchor(
    "text-primary underline underline-offset-4 hover:text-primary/80 transition-colors",
  ),
  code: createMdxCode(
    "font-sans text-sm rounded-[0.3em] bg-muted px-[0.4em] py-[0.2em] [&_span]:font-medium [&_span]:text-foreground!",
  ),
  Table: ({ data }: { data: { headers: string[]; rows: string[][] } }) => (
    <div className="my-6 w-full overflow-x-auto">
      <table className="text-muted-foreground w-full border-collapse text-sm">
        <thead className="border-border border-b">
          <tr>
            {data.headers.map((header, index) => (
              <th
                key={index}
                className="text-foreground px-4 py-2 text-left font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={index} className="border-border border-b last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
  blockquote: (props: BlockquoteProps) => (
    <blockquote
      className="border-border text-muted-foreground ml-[0.075em] border-l-3 pl-4 italic"
      {...props}
    />
  ),
};

declare global {
  type MDXProvidedComponents = Partial<typeof defaultComponents>;
}

/**
 * Defaults for every MDX document, merged with per-document overrides (the
 * homepage timeline passes its own via `<Timeline components={...} />`).
 */
export function useMDXComponents(
  components: MDXProvidedComponents = {},
): MDXProvidedComponents {
  return { ...defaultComponents, ...components };
}
