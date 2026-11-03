import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Paper on the sky: the one action that matters most. */
        primary:
          "h-10 rounded-[3px] border border-transparent bg-paper pr-4 pl-3.5 text-[15px] leading-none font-medium text-ink shadow-[0_1px_2px_#0f222b40,0_6px_18px_#0f222b26] transition-[background-color,translate] duration-[120ms] ease-out pointer-coarse:h-11 hover:bg-white active:translate-y-px active:duration-[90ms] [&_svg]:size-[17px]",
        /** Ink chips for secondary destinations, on the sky or the sheet. */
        chip: "h-10 rounded-[3px] border border-[#eef1ea33] bg-[#1d3038a6] pr-4 pl-3.5 text-[15px] leading-none font-medium text-paper shadow-[0_1px_2px_#0f222b33] transition-[background-color,translate] duration-[120ms] ease-out pointer-coarse:h-11 hover:bg-[#1d3038cc] active:translate-y-px active:duration-[90ms] [&_svg]:size-[17px]",
        link: "bg-transparent p-0 underline-offset-4 hover:underline",
      },
    },
    defaultVariants: { variant: "chip" },
  },
);

function Button({
  className,
  variant = "chip",
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
