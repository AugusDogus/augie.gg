"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "~/lib/utils";

// Tooltips under one provider share the skip delay: after the first one opens,
// neighbours open instantly. A Tooltip outside any provider brings its own.
const ProvidedContext = React.createContext(false);

function TooltipProvider({
  delayDuration = 400,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <ProvidedContext value={true}>
      <TooltipPrimitive.Provider
        data-slot="tooltip-provider"
        delayDuration={delayDuration}
        {...props}
      />
    </ProvidedContext>
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const root = <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
  return React.useContext(ProvidedContext) ? (
    root
  ) : (
    <TooltipProvider>{root}</TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 8,
  kbd,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  /** A keyboard hint shown after the label, such as "P" or "⌘K". */
  kbd?: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          // Only the delayed first tooltip animates; instant ones just appear.
          "material text-fg z-50 flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-2 rounded-[8px] border-white/10 px-2 py-1.5 text-[12px]/[16px] shadow-[0_1px_2px_#00000040,0_8px_24px_-8px_#00000080] select-none",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-97 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-97 duration-125 ease-out data-[state=closed]:duration-100 motion-reduce:data-[state=closed]:zoom-out-100 motion-reduce:data-[state=delayed-open]:zoom-in-100",
          className,
        )}
        {...props}
      >
        {children}
        {/* Visual only: triggers announce shortcuts with aria-keyshortcuts. */}
        {kbd === undefined ? null : (
          <kbd
            aria-hidden="true"
            className="kbd -my-0.5 -mr-[3px] h-[18px] min-w-[18px] px-1 text-[10.5px]"
          >
            {kbd}
          </kbd>
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
