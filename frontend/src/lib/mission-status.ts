export const ACTIVE_MISSION_STATUSES = new Set([
  "active",
  "running",
  "queued",
  "pending",
  "in_progress",
  "waiting",
]);

export function normalizeMissionStatus(
  status: unknown,
): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function isMissionActive(
  status: unknown,
): boolean {
  return ACTIVE_MISSION_STATUSES.has(
    normalizeMissionStatus(status),
  );
}
