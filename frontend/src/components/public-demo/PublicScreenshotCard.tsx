import type { PortfolioScreenshot } from "@/types/portfolio";

export function PublicScreenshotCard({ screenshot }: { screenshot: PortfolioScreenshot }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 transition hover:border-cyan-400/30">
      <div className="relative aspect-video bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_60%)]">
        {/* Static export uses repository-owned public assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={screenshot.imagePath} alt={screenshot.title} loading="lazy" className="h-full w-full object-cover" />
        {!screenshot.available ? <div className="absolute inset-0 grid place-items-center bg-slate-950/75 p-6 text-center text-xs uppercase tracking-[0.25em] text-slate-400">Screenshot coming soon</div> : null}
      </div>
      <div className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="font-black text-white">{screenshot.title}</h3>
          <span className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">{screenshot.category}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-400">{screenshot.description}</p>
      </div>
    </article>
  );
}
