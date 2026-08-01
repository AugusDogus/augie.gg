"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import { TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

interface ContributionDayProps {
  className: string;
  label: string;
}

/**
 * Bare Root rather than the `Tooltip` wrapper: the graph mounts one shared
 * TooltipProvider, so ~365 squares don't each spin up their own provider.
 */
export function ContributionDay({ className, label }: ContributionDayProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>
        <div className={className} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </TooltipPrimitive.Root>
  );
}
