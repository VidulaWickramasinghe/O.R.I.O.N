import { AuroraCard } from "../aurora-card";

type ModuleShellProps = {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
};

export function ModuleShell({
  title,
  description,
  badge,
  children,
}: ModuleShellProps) {
  return (
    <AuroraCard className="min-h-[calc(100vh-130px)] p-6">
      <div className="mb-6 flex flex-col justify-between gap-3 border-b border-white/10 pb-5 md:flex-row md:items-start">
        <div>
          <h2 className="text-3xl font-black text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
            {description}
          </p>
        </div>

        {badge && (
          <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            {badge}
          </span>
        )}
      </div>

      {children}
    </AuroraCard>
  );
}
