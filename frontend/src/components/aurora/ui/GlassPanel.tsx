import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  version?: string;
};

export function GlassPanel({ children, className = "", title, subtitle, version }: GlassPanelProps) {
  return (
    <section className={cn("rounded-[16px] border border-white/[0.09] bg-[#11151D]/78 shadow-2xl shadow-black/25 backdrop-blur-xl", className)}>
      {(title || subtitle || version) && (
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-4 py-4">
          <div className="min-w-0">
            {title && <h2 className="font-semibold text-slate-100">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>}
          </div>
          {version && <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 font-mono text-[10px] text-cyan-200">{version}</span>}
        </header>
      )}
      {children}
    </section>
  );
}
