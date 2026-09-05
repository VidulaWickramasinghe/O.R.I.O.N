import type { ToolAuditEventItem } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function ToolAuditPanel({
  events,
  metrics,
  report,
  metricValue,
}: {
  events: ToolAuditEventItem[];
  metrics: Record<string, unknown>;
  report: string;
  metricValue: (source: Record<string, unknown> | undefined, key: string, fallback?: string) => string;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Policy decision ledger</h2>
          <p className="text-sm text-slate-400">
            Policy decisions with actor, mission ownership, scope, and correlation evidence
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">Local evidence</span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="grid grid-cols-3 gap-2">
          <PermissionMetric label="Audit Events" value={metricValue(metrics, "total_audit_events")} tone="text-slate-100" />
          <PermissionMetric label="Allowed" value={metricValue(metrics, "allowed_events")} tone="text-emerald-200" />
          <PermissionMetric label="Blocked" value={metricValue(metrics, "blocked_events")} tone="text-red-200" />
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">
              No audit events recorded yet. Use protected tools to generate events.
            </p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Policy decision · {event.tool_name}</h3>
                    <p className="mt-1 text-xs text-cyan-300">
                      {event.plugin_key || "unmapped"} | {event.category}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      event.decision === "allowed"
                        ? "border-emerald-400/30 text-emerald-200"
                        : "border-red-400/30 text-red-200"
                    }`}
                  >
                    {event.decision}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{event.reason}</p>
                <dl className="mt-3 grid gap-x-4 gap-y-1 text-[10px] text-slate-500 sm:grid-cols-2">
                  <div><dt className="inline text-slate-600">Actor: </dt><dd className="inline">{event.actor || "unknown"}</dd></div>
                  <div><dt className="inline text-slate-600">Policy: </dt><dd className="inline">{event.policy_profile || "unknown"}</dd></div>
                  <div><dt className="inline text-slate-600">Mission / step / run: </dt><dd className="inline">{event.mission_id ?? "none"} / {event.step_id ?? "none"} / {event.run_id ?? "none"}</dd></div>
                  <div><dt className="inline text-slate-600">Approval: </dt><dd className="inline">{event.approval_id ?? "none"}</dd></div>
                  <div><dt className="inline text-slate-600">Risk / scope: </dt><dd className="inline">{event.risk_level} / {event.scope || "none"}</dd></div>
                  <div><dt className="inline text-slate-600">Side effect: </dt><dd className="inline">{event.side_effect ? "yes" : "no"}</dd></div>
                </dl>
                {event.correlation_id ? <p className="mt-2 break-all font-mono text-[10px] text-cyan-300/65">Correlation: {event.correlation_id}</p> : null}
                {event.arguments_hash ? <p className="mt-1 break-all font-mono text-[10px] text-slate-600">Arguments SHA-256: {event.arguments_hash}</p> : null}
                <p className="mt-2 text-[10px] text-slate-600">Source: {event.source} · {event.created_at}</p>
              </div>
            ))
          )}
        </div>

        <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
            Legacy policy-decision report
          </summary>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {report || "No tool audit report loaded yet."}
          </pre>
        </details>

        <p className="text-xs leading-5 text-slate-500">
          Safety: these rows are authorization decisions, not proof that an action completed. Execution results must be corroborated by correlated execution events and mission reports.
        </p>
      </div>
    </GlassPanel>
  );
}

function PermissionMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
