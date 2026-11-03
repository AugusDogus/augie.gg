import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-[background-color,color,scale] duration-150 ease-out active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** The one action that matters most on a surface. */
        primary:
          "h-9 pointer-coarse:h-10 rounded-[10px] bg-fg px-3.5 text-[13.5px] text-[#0a1317] shadow-[inset_0_-1px_0_#0000001f,0_1px_2px_#00000040] hover:bg-white [&_svg]:size-4",
        /** Glass, for secondary destinations. */
        secondary:
          "h-9 pointer-coarse:h-10 rounded-[10px] border border-white/10 bg-[#16232a]/60 shadow-[inset_0_1px_0_#ffffff0f] px-3.5 text-[13.5px] text-fg backdrop-blur-xl hover:bg-[#213038]/80 focus-visible:shadow-[inset_0_1px_0_#ffffff0f,0_0_0_4px_#060d11d9] [&_svg]:size-4",
        /** Quiet square buttons for icons. */
        icon: "size-9 pointer-coarse:size-10 rounded-[10px] text-fg-2 hover:bg-white/[.08] hover:text-fg [&_svg]:size-[18px]",
        link: "bg-transparent p-0 underline-offset-4 hover:underline active:scale-100",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);

function Button({
  className,
  variant = "secondary",
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
