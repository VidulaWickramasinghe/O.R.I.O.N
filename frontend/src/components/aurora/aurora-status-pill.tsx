type AuroraStatusPillProps = {
  children: string;
  tone?: "cyan" | "green" | "violet" | "amber" | "red";
};

const tones = {
  cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  violet: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  red: "border-red-400/30 bg-red-400/10 text-red-200",
};

export function AuroraStatusPill({
  children,
  tone = "cyan",
}: AuroraStatusPillProps) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
