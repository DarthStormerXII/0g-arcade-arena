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
        <span className="grid h-11 w-11 place-items-center rounded-md border border-[#d9b8ff44] bg-[#b56cff1a] text-[#e7c7ff] shadow-[0_0_32px_rgba(181,108,255,.24)]">
          {icon}
        </span>
        <h1 className="bg-gradient-to-r from-white via-[#e7c7ff] to-[#67e8ff] bg-clip-text text-3xl font-black uppercase text-transparent md:text-5xl">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
