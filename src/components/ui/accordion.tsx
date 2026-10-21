"use client";

import { Accordion as AccordionPrimitive } from "radix-ui";
import { PlusIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

export function Accordion(
  props: ComponentProps<typeof AccordionPrimitive.Root>,
) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("work-row border-t border-border", className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  children,
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "project-trigger group relative block w-full py-[17px] pr-7 text-left max-[600px]:py-4 data-[state=open]:[&>svg]:rotate-45",
          className,
        )}
        {...props}
      >
        {children}
        <PlusIcon
          className="absolute top-[21px] right-0 size-3.5 text-[#718087]"
          aria-hidden="true"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn("project-expanded pr-7 pb-5", className)}
      {...props}
    />
  );
}
