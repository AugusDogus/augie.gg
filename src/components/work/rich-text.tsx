import { Blurb } from "./blurb";

/** Blurb text with its `[text](url)` links rendered inline. */
export function RichText({ text }: { text: string }) {
  return Blurb.parse(text).map((segment, index) =>
    segment.kind === "link" ? (
      <a
        key={index}
        href={segment.href}
        target="_blank"
        rel="noopener noreferrer"
        className="decoration-fg-3 hover:decoration-fg underline underline-offset-[3px] transition-[text-decoration-color] duration-150 ease-out"
      >
        {segment.text}
      </a>
    ) : (
      <span key={index}>{segment.text}</span>
    ),
  );
}
