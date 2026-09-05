export type OperationalLifecycleStatus =
  | "draft"
  | "ready"
  | "running"
  | "waiting_for_approval"
  | "paused"
  | "blocked"
  | "failed"
  | "cancelled"
  | "complete";

export const OPERATIONAL_STATUS_LABELS: Record<
  OperationalLifecycleStatus,
  string
> = {
  draft: "Draft",
  ready: "Ready",
  running: "Running",
  waiting_for_approval: "Waiting for approval",
  paused: "Paused",
  blocked: "Blocked",
  failed: "Failed",
  cancelled: "Cancelled",
  complete: "Complete",
};

const STATUS_ALIASES: Record<string, OperationalLifecycleStatus> = {
  active: "running",
  approved: "complete",
  awaiting_approval: "waiting_for_approval",
  blocked: "blocked",
  canceled: "cancelled",
  cancelled: "cancelled",
  complete: "complete",
  completed: "complete",
  draft: "draft",
  error: "failed",
  executing: "running",
  failed: "failed",
  in_progress: "running",
  paused: "paused",
  pending: "ready",
  pending_approval: "waiting_for_approval",
  planned: "draft",
  processing: "running",
  queued: "ready",
  ready: "ready",
  recovery_required: "blocked",
  rejected: "failed",
  retry_pending: "ready",
  running: "running",
  succeeded: "complete",
  waiting: "waiting_for_approval",
  waiting_approval: "waiting_for_approval",
  waiting_for_approval: "waiting_for_approval",
};

export const ACTIVE_MISSION_STATUSES = new Set<OperationalLifecycleStatus>([
  "ready",
  "running",
  "waiting_for_approval",
  "paused",
  "blocked",
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
  const normalized = operationalMissionStatus(status);
  return normalized ? ACTIVE_MISSION_STATUSES.has(normalized) : false;
}

export function operationalMissionStatus(
  status: unknown,
): OperationalLifecycleStatus | null {
  return STATUS_ALIASES[normalizeMissionStatus(status)] ?? null;
}

export function operationalStatusLabel(status: unknown): string {
  const normalized = operationalMissionStatus(status);
  return normalized
    ? OPERATIONAL_STATUS_LABELS[normalized]
    : "Unavailable";
}
