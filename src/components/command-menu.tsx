"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Dialog } from "radix-ui";
import { useEffect } from "react";
import { CommandPanel } from "~/components/command-menu/panel";
import { useApple, withModifier } from "~/components/command-menu/platform";
import {
  closeMenu,
  openMenu,
  restoreFocus,
  toggleMenu,
  useMenuOpen,
} from "~/components/command-menu/store";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function isTextField(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input, textarea, select"))
  );
}

/** ⌘K or Ctrl+K toggles the menu anywhere; "/" opens it outside text fields. */
function useShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (
        event.key.toLowerCase() === "k" &&
        withModifier(event) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        toggleMenu();
      } else if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTextField(event.target)
      ) {
        event.preventDefault();
        openMenu();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/** Sizes the phone sheet to the visual viewport, so the on-screen keyboard never covers results. */
function trackViewport(node: HTMLDivElement | null) {
  const viewport = window.visualViewport;
  if (!node || !viewport) return undefined;
  const update = () =>
    node.style.setProperty("--viewport-height", `${viewport.height}px`);
  update();
  viewport.addEventListener("resize", update);
  return () => viewport.removeEventListener("resize", update);
}

export function CommandMenu() {
  const open = useMenuOpen();
  useShortcuts();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) closeMenu();
      }}
    >
      <Dialog.Portal>
        {/* .material without its look: the flight engine ignores pointers over it, so the scrim never stirs the painting. */}
        <Dialog.Overlay className="material data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 rounded-none border-0 bg-[#00000066] bg-none shadow-none backdrop-filter-none duration-160 ease-out" />
        <Dialog.Content
          ref={trackViewport}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
          className={cn(
            "material fixed inset-x-3 top-3 z-50 flex max-h-[calc(var(--viewport-height,100dvh)_-_24px)] origin-top flex-col overflow-hidden outline-none",
            "sm:inset-x-0 sm:mx-auto sm:w-[560px]",
            // Short windows (landscape phones, a raised keyboard) keep the top-3 sheet sized to its content.
            "[@media(min-width:640px)_and_(min-height:500px)]:top-[clamp(72px,16vh,152px)] [@media(min-width:640px)_and_(min-height:500px)]:h-[min(544px,calc(var(--viewport-height,100dvh)_-_clamp(72px,16vh,152px)_-_24px))]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:motion-safe:slide-in-from-top-1 data-[state=open]:motion-safe:zoom-in-[.97] ease-out data-[state=open]:duration-180",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:motion-safe:slide-out-to-top-1 data-[state=closed]:motion-safe:zoom-out-[.97] data-[state=closed]:duration-120",
          )}
        >
          <Dialog.Title className="sr-only">Command menu</Dialog.Title>
          <CommandPanel />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CommandMenuTrigger() {
  const apple = useApple();
  const open = useMenuOpen();
  return (
    <Button
      variant="secondary"
      // Without script the menu can't open, so the header keeps only GitHub.
      className="text-fg-2 hover:text-fg bg-[#16232acc] pr-1.5 hover:bg-[#213038d9] pointer-coarse:h-10 pointer-coarse:pr-3.5 noscript:hidden"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-keyshortcuts={apple === false ? "Control+K" : "Meta+K"}
      onClick={(event) => openMenu(event.currentTarget)}
    >
      <MagnifyingGlassIcon aria-hidden="true" />
      Search
      {/* Both chips share one cell, so the button keeps its width when the platform is known. */}
      <span
        aria-hidden="true"
        className="grid justify-items-end *:[grid-area:1/1] pointer-coarse:hidden"
      >
        <kbd
          className={cn(
            "kbd transition-opacity duration-200",
            apple !== false && "opacity-0",
          )}
        >
          Ctrl K
        </kbd>
        <kbd
          className={cn(
            "kbd transition-opacity duration-200",
            apple !== true && "opacity-0",
          )}
        >
          ⌘K
        </kbd>
      </span>
    </Button>
  );
}
