import { cn } from "@/lib/utils";

type Tone = "primary" | "secondary" | "success" | "warning" | "danger" | "muted";
const toneClass: Record<Tone, string> = {
  primary: "border-[#4F8BFF]/40 bg-[#4F8BFF]/12 text-blue-200",
  secondary: "border-[#7B5CFF]/40 bg-[#7B5CFF]/12 text-violet-200",
  success: "border-[#18E299]/40 bg-[#18E299]/12 text-emerald-200",
  warning: "border-[#FFC857]/40 bg-[#FFC857]/12 text-amber-200",
  danger: "border-[#FF5D73]/40 bg-[#FF5D73]/12 text-rose-200",
  muted: "border-white/10 bg-white/[0.04] text-slate-400",
};
export function StatusChip({ tone = "muted", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold", toneClass[tone], className)}>{children}</span>;
}
