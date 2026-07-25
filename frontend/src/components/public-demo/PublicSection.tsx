import type { ReactNode } from "react";

type PublicSectionProps = { eyebrow: string; title: string; description?: string; children: ReactNode; id?: string; muted?: boolean };

export function PublicSection({ eyebrow, title, description, children, id, muted = false }: PublicSectionProps) {
  return (
    <section id={id} className={`scroll-mt-4 px-4 py-16 sm:px-6 md:px-10 md:py-20 ${muted ? "border-y border-white/10 bg-white/[0.02]" : ""}`}>
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">{eyebrow}</p>
        <h2 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">{title}</h2>
        {description ? <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base sm:leading-8">{description}</p> : null}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
