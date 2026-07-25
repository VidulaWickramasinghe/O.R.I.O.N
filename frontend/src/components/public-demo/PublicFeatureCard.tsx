type PublicFeatureCardProps = { title: string; description: string; index: number };

export function PublicFeatureCard({ title, description, index }: PublicFeatureCardProps) {
  return (
    <article className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-cyan-500/10 sm:p-6">
      <span className="text-xs font-black text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
      <h3 className="mt-5 text-base font-black text-white sm:text-lg">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
    </article>
  );
}
