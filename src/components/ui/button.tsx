import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-bold uppercase tracking-normal transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--arena-green)] bg-[color:var(--arena-green)] text-black shadow-[0_0_24px_rgba(70,255,159,0.25)] hover:bg-[#78ffba]",
        secondary:
          "border-[color:var(--arena-line)] bg-white/5 text-white hover:border-[color:var(--arena-cyan)] hover:bg-white/10",
        danger:
          "border-[color:var(--arena-red)] bg-[color:var(--arena-red)] text-black hover:bg-[#ff8aa0]",
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
