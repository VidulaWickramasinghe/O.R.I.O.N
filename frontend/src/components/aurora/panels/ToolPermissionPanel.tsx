"use client";

import { useMemo, useState } from "react";
import type { ToolPermissionItem } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function ToolPermissionPanel({
  matrix,
  metrics,
  report,
  metricValue,
}: {
  matrix: ToolPermissionItem[];
  metrics: Record<string, unknown>;
  report: string;
  metricValue: (source: Record<string, unknown> | undefined, key: string, fallback?: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<"all" | "allowed" | "blocked">("all");
  const [category, setCategory] = useState("all");
  const categories = useMemo(
    () => Array.from(new Set(matrix.map((item) => item.category).filter(Boolean))).sort(),
    [matrix],
  );
  const visibleTools = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return matrix.filter((item) => {
      const matchesQuery = !cleanQuery || [item.tool_name, item.plugin_name, item.plugin_key, item.category, item.permissions.join(" ")].some((value) => value.toLowerCase().includes(cleanQuery));
      const matchesAvailability = availability === "all" || (availability === "allowed" ? item.allowed : !item.allowed);
      return matchesQuery && matchesAvailability && (category === "all" || item.category === category);
    });
  }, [availability, category, matrix, query]);
  const groupedTools = useMemo(() => Object.entries(
    visibleTools.reduce<Record<string, ToolPermissionItem[]>>((groups, item) => {
      (groups[item.category || "Uncategorized"] ??= []).push(item);
      return groups;
    }, {}),
  ).sort(([left], [right]) => left.localeCompare(right)), [visibleTools]);

  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Tool Permission Enforcement</h2>
          <p className="text-sm text-slate-400">
            Plugin-controlled tool access, blocked tools, protected tools, and risk visibility
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <PermissionMetric label="Mapped" value={metricValue(metrics, "total_mapped_tools")} tone="text-slate-100" />
          <PermissionMetric label="Allowed" value={metricValue(metrics, "allowed_tools")} tone="text-emerald-200" />
          <PermissionMetric label="Blocked" value={metricValue(metrics, "blocked_tools")} tone="text-red-200" />
          <PermissionMetric label="High Risk" value={metricValue(metrics, "high_risk_tools")} tone="text-yellow-200" />
          <PermissionMetric label="HR Allowed" value={metricValue(metrics, "high_risk_allowed")} tone="text-cyan-200" />
        </div>

        <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="text-xs text-slate-300"><span className="sr-only">Search capabilities</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tool, plugin, permission, or category" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/30" /></label>
          <label className="text-xs text-slate-300"><span className="sr-only">Filter availability</span><select aria-label="Filter availability" value={availability} onChange={(event) => setAvailability(event.target.value as "all" | "allowed" | "blocked")} className="w-full rounded-xl border border-white/10 bg-[#0b0f17] px-3 py-2.5 text-xs text-white"><option value="all">All availability</option><option value="allowed">Allowed</option><option value="blocked">Blocked</option></select></label>
          <label className="text-xs text-slate-300"><span className="sr-only">Filter category</span><select aria-label="Filter category" value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0b0f17] px-3 py-2.5 text-xs text-white"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          {matrix.length === 0 ? (
            <p className="text-sm text-slate-500">Tool permission matrix has not loaded yet.</p>
          ) : visibleTools.length === 0 ? (
            <p className="text-sm text-slate-400">No capabilities match the current search and filters.</p>
          ) : (
            groupedTools.map(([group, items]) => <section key={group} className="space-y-2"><h3 className="sticky top-0 z-10 bg-[#11151d] px-1 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200">{group} · {items.length}</h3>{items.map((item) => {
              const allowed = item.allowed;
              return (
                <div key={item.tool_name} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{item.tool_name}</h3>
                      <p className="mt-1 text-xs text-cyan-300">
                        {item.plugin_key} | {item.category}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                        allowed
                          ? "border-emerald-400/30 text-emerald-200"
                          : "border-red-400/30 text-red-200"
                      }`}
                    >
                      {allowed ? "allowed" : "blocked"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Plugin: {item.plugin_name}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Plugin key: {item.plugin_key}
                  </p>

                  {item.policy_blocked && (
                    <p className="mt-2 rounded-xl border border-red-300/15 bg-red-300/[0.05] p-2 text-xs leading-5 text-red-200">
                      Policy blocked
                      {item.block_reason ? ` — ${item.block_reason}` : ""}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] ${
                        item.risk_level === "high"
                          ? "border-red-400/30 text-red-200"
                          : item.risk_level === "medium"
                          ? "border-yellow-400/30 text-yellow-200"
                          : "border-emerald-400/30 text-emerald-200"
                      }`}
                    >
                      {item.risk_level}
                    </span>
                    {item.protected && (
                      <span className="rounded-full border border-violet-400/30 px-2 py-1 text-[10px] text-violet-200">
                        protected
                      </span>
                    )}
                    {item.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}</section>)
          )}
        </div>

        <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
            Tool Permission Report
          </summary>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {report || "No tool permission report loaded yet."}
          </pre>
        </details>

        <p className="text-xs leading-5 text-slate-500">
          Safety: protected tools now check the Plugin Registry before execution. Disabled plugins block mapped tools safely.
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
