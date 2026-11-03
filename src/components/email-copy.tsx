"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";

type CopyState =
  | { result: "idle" }
  | { result: "success" | "error"; instant: boolean; sequence: number };

export function EmailCopy() {
  const [state, setState] = useState<CopyState>({ result: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy(instant: boolean) {
    const sequence = ++request.current;
    let result: "success" | "error" = "success";
    try {
      await navigator.clipboard.writeText("hi@augie.gg");
    } catch {
      result = "error";
    }
    if (sequence !== request.current) return;
    if (timer.current) clearTimeout(timer.current);
    setState({ result, instant, sequence });
    timer.current = setTimeout(
      () => setState({ result: "idle" }),
      result === "success" ? 2400 : 6000,
    );
  }

  return (
    <span className="email-contact">
      <Button
        variant="link"
        className="contact-link"
        aria-label="Copy hi@augie.gg to clipboard"
        onClick={(event) => copy(event.detail === 0)}
      >
        hi@augie.gg
      </Button>
      <output aria-live="polite" aria-atomic="true">
        <span
          key={state.result === "idle" ? "idle" : state.sequence}
          className="copy-note"
          data-visible={state.result !== "idle"}
          data-result={state.result}
          data-instant={state.result !== "idle" && state.instant}
        >
          <svg className="copy-check" viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5 10 3.5 3.5L15 6.5" pathLength="1" />
          </svg>
          <span>
            {state.result === "success"
              ? "Copied!"
              : state.result === "error"
                ? "Couldn’t copy. Select the email and copy it manually."
                : ""}
          </span>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="copy-spark" aria-hidden="true" />
          ))}
        </span>
      </output>
    </span>
  );
}
