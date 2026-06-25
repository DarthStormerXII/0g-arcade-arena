import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-bold uppercase tracking-normal transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[#d9b8ff] bg-[linear-gradient(135deg,#f5e8ff,#b56cff_42%,#5d22a6)] text-[#10051c] shadow-[0_0_34px_rgba(181,108,255,0.34)] hover:brightness-110",
        secondary:
          "border-[color:var(--arena-line)] bg-white/8 text-white backdrop-blur hover:border-[color:var(--arena-violet-soft)] hover:bg-[#b56cff1a]",
        danger:
          "border-[color:var(--arena-fuchsia)] bg-[color:var(--arena-fuchsia)] text-[#16030b] hover:bg-[#f0abfc]",
        ghost: "border-transparent bg-transparent text-white hover:bg-white/10",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
