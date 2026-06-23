import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-md border border-[color:var(--arena-line)] bg-[color:var(--arena-panel)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_70px_rgba(0,0,0,0.32)]",
        className,
      )}
      {...props}
    />
  );
}

export function StatusPill({
  tone = "green",
  children,
}: {
  tone?: "green" | "cyan" | "yellow" | "red" | "muted";
  children: ReactNode;
}) {
  const tones = {
    green: "border-[#46ff9f66] bg-[#46ff9f1a] text-[#98ffc9]",
    cyan: "border-[#57e2ff66] bg-[#57e2ff1a] text-[#9ff0ff]",
    yellow: "border-[#ffe66d66] bg-[#ffe66d1a] text-[#fff1a3]",
    red: "border-[#ff5c7a66] bg-[#ff5c7a1a] text-[#ff9bad]",
    muted: "border-white/15 bg-white/5 text-white/70",
  };
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-bold uppercase tracking-normal",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
