import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,background-color,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sand",
  {
    variants: {
      variant: {
        default: "bg-ink text-sand hover:bg-ink-soft",
        accent: "bg-accent text-accent-fg hover:bg-accent/90",
        outline: "border border-border bg-paper text-fg hover:bg-sand-2",
        ghost: "text-fg hover:bg-sand-2",
        sand: "bg-sand-2 text-ink hover:bg-border",
      },
      size: {
        default: "h-11 min-h-11 px-4",
        sm: "h-9 min-h-9 px-3 text-sm",
        lg: "h-12 min-h-12 px-6",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
