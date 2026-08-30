"use client";

import { useState } from "react";
import Link from "next/link";
import { ArchiveRestore, DatabaseBackup, RefreshCw, ShieldCheck } from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { useAuroraPersistence } from "@/components/aurora/lib/aurora-queries";
import {
  createRuntimeBackup,
  requestRuntimeRestore,
} from "@/lib/api/persistence";

export function PersistenceRecoveryPanel() {
  const persistence = useAuroraPersistence();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const data = persistence.data;

  async function createBackup() {
    setBusy("backup");
    setMessage("");
    try {
      const backup = await createRuntimeBackup();
      setMessage(`Verified backup created: ${backup.backup_id}`);
      await persistence.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Backup creation failed.");
    } finally {
      setBusy("");
    }
  }

  async function requestRestore(backupId: string) {
    setBusy(backupId);
    setMessage("");
    try {
      const result = await requestRuntimeRestore(backupId);
      setMessage(
        `Approval ${result.approval.id} created. Approve it in Governance; restore applies on the next backend restart.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restore request failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <GlassPanel className="border-violet-400/20 bg-white/[0.06] p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <DatabaseBackup size={20} className="text-violet-300" />
            Persistence Recovery
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Versioned SQLite stores, verified backups, and restart-bound restore.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void persistence.refetch()}
            disabled={persistence.isFetching}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.05] disabled:opacity-60"
          >
            <RefreshCw size={14} className="inline" /> Refresh
          </button>
          <button
            onClick={() => void createBackup()}
            disabled={Boolean(busy) || !data?.healthy}
            className="rounded-xl border border-violet-400/30 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/10 disabled:opacity-60"
          >
            <DatabaseBackup size={14} className="inline" /> {busy === "backup" ? "Backing up…" : "Create backup"}
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-xs text-cyan-100">
          {message}
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
        <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Schema policy</h3>
            <span className={data?.healthy ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>
              {data?.healthy ? "Healthy" : "Unavailable"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(data?.stores ?? []).map((store) => (
              <div key={store.key} className="rounded-xl border border-white/[0.07] p-3 text-xs">
                <p className="font-semibold text-slate-200">{store.key.replaceAll("_", " ")}</p>
                <p className="mt-1 text-slate-500">
                  Schema {store.schema_version ?? "—"}/{store.target_version} · {store.journal_mode ?? "—"}
                </p>
                <p className="mt-1 text-slate-600">
                  FK {store.foreign_keys ? "on" : "off"} · integrity {store.integrity ?? "unchecked"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <ArchiveRestore size={16} className="text-cyan-300" /> Verified backups
          </h3>
          {data?.pending_restore && (
            <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100">
              Restore scheduled for the next backend restart.
            </p>
          )}
          <div className="mt-3 max-h-80 space-y-2 overflow-auto">
            {(data?.backups ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">No verified backup exists yet.</p>
            ) : (
              data?.backups.map((backup) => (
                <article key={backup.backup_id} className="rounded-xl border border-white/[0.07] p-3">
                  <p className="break-all text-xs font-semibold text-slate-200">{backup.backup_id}</p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    {backup.stores?.length ?? 0} stores · {backup.created_at ?? "time unavailable"}
                  </p>
                  {backup.valid === false ? (
                    <p className="mt-2 text-xs text-red-300">Invalid: {backup.error}</p>
                  ) : (
                    <button
                      onClick={() => void requestRestore(backup.backup_id)}
                      disabled={Boolean(busy)}
                      className="mt-2 rounded-lg border border-amber-300/20 px-2 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-300/[0.08] disabled:opacity-60"
                    >
                      {busy === backup.backup_id ? "Requesting…" : "Request restore approval"}
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-300" />
        Restore never replaces live databases. Approval schedules a hash-bound backup for startup recovery. Review requests in <Link href="/tools" className="text-cyan-300 hover:underline">Governance → Tools</Link>.
      </p>
    </GlassPanel>
  );
}
