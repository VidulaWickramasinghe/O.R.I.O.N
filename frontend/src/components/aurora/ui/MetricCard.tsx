type Tone = "default" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = { default: "text-slate-100", success: "text-emerald-200", warning: "text-yellow-200", danger: "text-red-200", info: "text-cyan-200" };

export function MetricCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: Tone }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p></div>;
}
