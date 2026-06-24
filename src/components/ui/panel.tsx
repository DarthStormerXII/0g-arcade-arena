import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "liquid-chrome rounded-md border border-[color:var(--arena-line)] bg-[color:var(--arena-panel)] p-4 backdrop-blur-xl",
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
    green: "border-[#b56cff66] bg-[#b56cff1f] text-[#e7c7ff]",
    cyan: "border-[#67e8ff66] bg-[#67e8ff17] text-[#aef4ff]",
    yellow: "border-[#ffd17a66] bg-[#ffd17a18] text-[#ffe0a6]",
    red: "border-[#ff6b9d66] bg-[#ff6b9d1a] text-[#ffadc8]",
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
