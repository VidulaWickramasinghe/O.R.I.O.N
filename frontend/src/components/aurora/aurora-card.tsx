import { ReactNode } from "react";

type AuroraCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuroraCard({ children, className = "" }: AuroraCardProps) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/[0.055] shadow-2xl shadow-cyan-500/5 backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}
