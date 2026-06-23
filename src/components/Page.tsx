import type { ReactNode } from "react";

export function Page({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-md border border-white/15 bg-white/8">
          {icon}
        </span>
        <h1 className="text-3xl font-black uppercase md:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}
