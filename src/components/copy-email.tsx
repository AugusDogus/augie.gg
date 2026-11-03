"use client";

import { CheckIcon, CopyIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "~/components/ui/button";
import { EMAIL } from "~/lib/site";

/** How a visitor finishes the copy by hand: a key chord, or touch selection. */
type ManualCopy =
  | { kind: "keys"; label: string; spoken: string }
  | { kind: "touch" };
/** `instant` marks keyboard activation, which swaps states without the crossfade. */
type CopyState =
  | { phase: "idle"; instant: boolean }
  | { phase: "copied"; instant: boolean }
  | { phase: "failed"; instant: boolean; manual: ManualCopy };

function manualCopy(): ManualCopy {
  if (matchMedia("(pointer: coarse)").matches) return { kind: "touch" };
  return /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? { kind: "keys", label: "⌘C", spoken: "Command C" }
    : { kind: "keys", label: "Ctrl C", spoken: "Control C" };
}

async function writeEmail() {
  try {
    await navigator.clipboard.writeText(EMAIL);
    return true;
  } catch {
    return false;
  }
}

function announcement(state: CopyState) {
  switch (state.phase) {
    case "idle":
      return "";
    case "copied":
      return "Email address copied";
    case "failed":
      return state.manual.kind === "keys"
        ? `Couldn’t copy automatically. The address is selected; press ${state.manual.spoken} to copy it.`
        : "Couldn’t copy automatically. The address is selected so you can copy it.";
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

function useCopyEmail() {
  const [state, setState] = useState<CopyState>({
    phase: "idle",
    instant: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
      clearTimeout(timer.current);
    },
    [],
  );

  function copied(instant: boolean) {
    clearTimeout(timer.current);
    setState({ phase: "copied", instant });
    timer.current = setTimeout(
      () => setState({ phase: "idle", instant }),
      1800,
    );
  }

  async function copy(instant: boolean) {
    const sequence = ++request.current;
    const ok = await writeEmail();
    if (sequence !== request.current) return;
    if (ok) {
      copied(instant);
      return;
    }
    clearTimeout(timer.current);
    setState({ phase: "failed", instant, manual: manualCopy() });
  }

  /** Leaves the manual-copy fallback once the selection is gone. */
  const dismissFailure = useCallback(() => {
    setState((current) =>
      current.phase === "failed" ? { phase: "idle", instant: true } : current,
    );
  }, []);

  return { state, copy, copied, dismissFailure };
}

/** The hero's primary action: copies the address and confirms in place. */
export function CopyEmailButton() {
  const { state, copy, copied, dismissFailure } = useCopyEmail();
  const button = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const shown = useRef<HTMLSpanElement>(null);
  const manual = state.phase === "failed" ? state.manual : null;
  const manualKind = manual?.kind;
  useEffect(() => {
    if (manualKind !== "keys") return;
    field.current?.focus();
    field.current?.select();
  }, [manualKind]);
  // Touch has no copy chord: the address stays on screen, selected, until the
  // visitor copies it or selects something else.
  useEffect(() => {
    const node = shown.current;
    if (manualKind !== "touch" || !node) return undefined;
    getSelection()?.selectAllChildren(node);
    const onSelectionChange = () => {
      if (!getSelection()?.containsNode(node, true)) dismissFailure();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [manualKind, dismissFailure]);

  return (
    <>
      <span className="relative inline-flex noscript:hidden">
        <Button
          ref={button}
          variant="primary"
          aria-label={`Copy ${EMAIL}`}
          data-phase={state.phase}
          className="data-[phase=failed]:outline-accent data-[phase=failed]:outline-2 data-[phase=failed]:outline-offset-2"
          onClick={(event) => void copy(event.detail === 0)}
        >
          <span className="copy-swap" data-instant={state.instant}>
            <span data-active={state.phase === "idle"}>
              <CopyIcon aria-hidden="true" />
              {EMAIL}
            </span>
            <span data-active={state.phase === "copied"}>
              <CheckIcon weight="bold" aria-hidden="true" />
              Copied
            </span>
            {manual?.kind === "keys" ? (
              <span data-active="true" data-enter="true">
                {manual.label} to copy
              </span>
            ) : null}
          </span>
        </Button>
        {manual?.kind === "touch" ? (
          // Outside the button, so the address can be selected and copied by hand.
          <>
            <span
              className="copy-swap absolute inset-0 text-[13.5px] font-medium text-[#0a1317]"
              onCopy={() => copied(true)}
            >
              <span
                ref={shown}
                data-active="true"
                data-enter="true"
                className="selection:text-fg select-all selection:bg-[#0a1317]"
              >
                {EMAIL}
              </span>
            </span>
            {/* The <output> below already says this to screen readers. Where
                the Résumé button wraps under this one, the hint goes above. */}
            <span
              aria-hidden="true"
              className="text-fg-2 absolute top-full left-0 mt-2 text-xs whitespace-nowrap max-[289px]:top-auto max-[289px]:bottom-full max-[289px]:mt-0 max-[289px]:mb-2"
            >
              Press and hold to copy
            </span>
          </>
        ) : null}
        {manual?.kind === "keys" ? (
          <input
            ref={field}
            readOnly
            value={EMAIL}
            aria-label="Email address"
            tabIndex={-1}
            className="sr-only"
            onCopy={() => {
              copied(true);
              button.current?.focus();
            }}
            onBlur={dismissFailure}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              button.current?.focus();
            }}
          />
        ) : null}
        <output aria-live="polite" className="sr-only">
          {announcement(state)}
        </output>
      </span>
      {/* Copying needs script; without it the address is a plain mail link.
          Hidden with script, so it never takes a gap in the button row. */}
      <noscript className="hidden noscript:contents">
        <a
          href={`mailto:${EMAIL}`}
          className={buttonVariants({ variant: "primary" })}
        >
          <EnvelopeSimpleIcon aria-hidden="true" />
          {EMAIL}
        </a>
      </noscript>
    </>
  );
}

/** The address inline in running text, as on the résumé. */
export function CopyEmailLink() {
  const { state, copy, copied, dismissFailure } = useCopyEmail();
  const text = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (state.phase !== "failed" || !text.current) return;
    getSelection()?.selectAllChildren(text.current);
  }, [state.phase]);

  return (
    <span
      className="copy-link"
      onCopy={() => {
        if (state.phase === "failed") copied(true);
      }}
    >
      <button
        type="button"
        aria-label={`Copy ${EMAIL}`}
        onClick={(event) => void copy(event.detail === 0)}
        onBlur={dismissFailure}
      >
        <span ref={text}>{EMAIL}</span>
        <span className="copy-swap" data-instant={state.instant}>
          <span data-active={state.phase !== "copied"}>
            <CopyIcon aria-hidden="true" />
          </span>
          <span data-active={state.phase === "copied"}>
            <CheckIcon weight="bold" aria-hidden="true" />
          </span>
        </span>
      </button>
      <a className="copy-link-print" href={`mailto:${EMAIL}`}>
        {EMAIL}
      </a>
      {/* On touch the selected address is the whole hint. */}
      {state.phase === "failed" && state.manual.kind === "keys" ? (
        <span className="copy-link-hint" aria-hidden="true">
          Press {state.manual.label} to copy
        </span>
      ) : null}
      <output aria-live="polite" className="sr-only">
        {announcement(state)}
      </output>
    </span>
  );
}
