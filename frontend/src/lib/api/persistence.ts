import { api } from "@/lib/api/client";

export type PersistenceStore = {
  key: string;
  available: boolean;
  schema_version?: number;
  target_version: number;
  journal_mode?: string;
  foreign_keys?: boolean;
  integrity?: string;
  foreign_key_errors?: number;
};

export type RuntimeBackup = {
  backup_id: string;
  created_at?: string;
  format_version?: number;
  stores?: Array<{ key: string; filename: string; state_sha256: string }>;
  valid?: boolean;
  error?: string;
};

export type PersistenceOverview = {
  healthy: boolean;
  stores: PersistenceStore[];
  backups: RuntimeBackup[];
  pending_restore: Record<string, unknown> | null;
  last_restore: Record<string, unknown> | null;
};

export const getPersistenceOverview = () =>
  api.get<PersistenceOverview>("/api/system/persistence");

export const createRuntimeBackup = () =>
  api.post<RuntimeBackup>("/api/system/persistence/backups");

export const requestRuntimeRestore = (backupId: string) =>
  api.post<{ status: string; approval: { id: number; status: string } }>(
    `/api/system/persistence/backups/${encodeURIComponent(backupId)}/restore-request`,
  );
