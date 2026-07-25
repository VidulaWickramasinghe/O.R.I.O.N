export type StatusTone = "success" | "info" | "warning" | "danger" | "neutral";
const STATUS_GROUPS: Record<StatusTone, readonly string[]> = {
  success: ["online", "ready", "completed", "approved", "connected", "healthy"],
  info: ["running", "active", "processing", "queued", "executing", "thinking"],
  warning: ["waiting", "paused", "approval required", "degraded", "needs review", "pending"],
  danger: ["failed", "blocked", "critical", "rejected", "offline", "error"],
  neutral: ["idle", "unknown", "unavailable"],
};
export function getStatusTone(status: string): StatusTone {
  const value = status.trim().toLowerCase();
  return (Object.keys(STATUS_GROUPS) as StatusTone[]).find((tone) => STATUS_GROUPS[tone].includes(value)) ?? "neutral";
}
