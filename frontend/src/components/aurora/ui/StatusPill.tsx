type Tone = "success" | "warning" | "danger" | "info" | "default";
const tones: Record<Tone, string> = { success: "border-emerald-400/30 text-emerald-200", warning: "border-yellow-400/30 text-yellow-200", danger: "border-red-400/30 text-red-200", info: "border-cyan-400/30 text-cyan-200", default: "border-slate-400/30 text-slate-300" };

export function StatusPill({ children, tone = "default" }: { children: string; tone?: Tone }) {
  return <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${tones[tone]}`}>{children}</span>;
}
