import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[16px] border border-white/[0.09] bg-[#11151D]/78 shadow-2xl shadow-black/25 backdrop-blur-xl", className)}>
      {children}
    </section>
  );
}
