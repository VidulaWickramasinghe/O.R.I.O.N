export function metricValue(
  source: Record<string, unknown> | undefined,
  key: string,
  fallback = "0"
) {
  const value = source?.[key];
  return value === undefined || value === null ? fallback : String(value);
}

export function scoreTone(score: number) {
  if (score >= 85) return "text-emerald-200 border-emerald-400/30 bg-emerald-500/10";
  if (score >= 70) return "text-cyan-200 border-cyan-400/30 bg-cyan-500/10";
  if (score >= 50) return "text-yellow-200 border-yellow-400/30 bg-yellow-500/10";
  return "text-red-200 border-red-400/30 bg-red-500/10";
}
