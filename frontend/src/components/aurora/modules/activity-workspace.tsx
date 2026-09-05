"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { useAuroraActivity } from "@/components/aurora/lib/aurora-queries";
import {
  ActivityTimeline,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  NextActionLink,
  PageHeader,
} from "@/components/aurora/operational-ui";

function eventTone(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("denied") || normalized.includes("error")) return "danger" as const;
  if (normalized.includes("approval") || normalized.includes("waiting")) return "warning" as const;
  if (normalized.includes("complete") || normalized.includes("success")) return "success" as const;
  return "info" as const;
}

function eventTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || "Time unavailable"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function eventTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Operational event";
}

export function ActivityWorkspace() {
  const activityQuery = useAuroraActivity();
  const events = activityQuery.data?.events ?? [];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <PageHeader
        eyebrow="Operations · Evidence-backed timeline"
        title="Activity"
        description="Follow human-readable mission, approval, failure, and recovery events. Raw authorization and execution evidence remains in Audit."
        metadata={<p className="text-[11px] text-slate-400">{activityQuery.dataUpdatedAt ? `Last synchronized ${eventTime(new Date(activityQuery.dataUpdatedAt).toISOString())}` : "Not synchronized"}</p>}
        actions={
          <>
            <Link href="/audit" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-300/20 hover:text-cyan-100">Open raw audit</Link>
            <button type="button" onClick={() => void activityQuery.refetch()} disabled={activityQuery.isFetching} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-50">
              <RefreshCw size={13} className={activityQuery.isFetching ? "animate-spin" : ""} />Refresh
            </button>
          </>
        }
      />

      {activityQuery.isLoading ? <LoadingSkeleton label="Loading activity" /> : null}
      {activityQuery.isError ? <ErrorState title="Activity unavailable" description="The authenticated activity endpoint did not return evidence. Check Diagnostics, then retry." onRetry={() => void activityQuery.refetch()} /> : null}

      {!activityQuery.isLoading && !activityQuery.isError ? (
        <section className="orion-panel p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-white">Operational timeline</h2>
              <p className="mt-1 text-xs text-slate-500">{events.length} events returned by the backend · newest first</p>
            </div>
            <NextActionLink href="/missions">Open missions</NextActionLink>
          </div>
          {events.length ? (
            <ActivityTimeline
              items={events.map((event) => ({
                id: event.id,
                title: eventTitle(event.type || ""),
                detail: `${event.message}${event.source ? ` · Source: ${event.source}` : ""}${event.correlation_id ? ` · Correlation: ${event.correlation_id}` : ""}`,
                timestamp: eventTime(event.timestamp),
                tone: eventTone(event.type || ""),
                href: event.approval_id ? "/approvals" : event.mission_id ? "/missions" : "/audit",
              }))}
            />
          ) : (
            <EmptyState title="No activity recorded" description="The backend is connected and returned an empty activity stream. New mission and approval events will appear here." />
          )}
        </section>
      ) : null}
    </div>
  );
}
