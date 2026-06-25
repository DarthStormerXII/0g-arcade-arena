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
    cyan: "border-[#c084fc66] bg-[#c084fc17] text-[#eadcff]",
    yellow: "border-[#d8b4fe66] bg-[#d8b4fe18] text-[#f3e8ff]",
    red: "border-[#e879f966] bg-[#e879f91a] text-[#f5d0fe]",
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
