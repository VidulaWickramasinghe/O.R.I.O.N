"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LockKeyhole,
  Puzzle,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { useAuroraStore } from "@/store/auroraStore";

type StatusFilter = "all" | "enabled" | "disabled";
type RiskFilter = "all" | "low" | "medium" | "high";

const PROTECTED_PLUGIN_KEYS = new Set([
  "approval_system",
  "plugin_registry",
  "tool_permission_enforcement",
  "tool_audit_center",
  "security_policy_profiles",
]);

function metricValue(
  source: Record<string, unknown>,
  key: string,
  fallback = "0",
) {
  const value = source[key];

  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

export function PluginsWorkspace() {
  const plugins = useAuroraStore((state) => state.plugins);
  const metrics = useAuroraStore((state) => state.pluginMetrics);
  const report = useAuroraStore(
    (state) => state.pluginRegistryReport,
  );
  const pluginLoadingKey = useAuroraStore(
    (state) => state.pluginLoadingKey,
  );
  const loadPlugins = useAuroraStore(
    (state) => state.loadPlugins,
  );
  const toolPermissionMatrix = useAuroraStore(
    (state) => state.toolPermissionMatrix,
  );
  const loadToolPermissions = useAuroraStore(
    (state) => state.loadToolPermissions,
  );
  const updatePluginStatusFromStore = useAuroraStore(
    (state) => state.updatePluginStatusFromStore,
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [riskFilter, setRiskFilter] =
    useState<RiskFilter>("all");
  const [categoryFilter, setCategoryFilter] =
    useState("all");

  useEffect(() => {
    void Promise.all([
      loadPlugins(),
      loadToolPermissions(),
    ]);
  }, [loadPlugins, loadToolPermissions]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        plugins
          .map((plugin) => plugin.category)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [plugins]);

  const filteredPlugins = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return plugins.filter((plugin) => {
      const matchesQuery =
        !cleanQuery ||
        plugin.name.toLowerCase().includes(cleanQuery) ||
        plugin.key.toLowerCase().includes(cleanQuery) ||
        plugin.description.toLowerCase().includes(cleanQuery) ||
        plugin.category.toLowerCase().includes(cleanQuery) ||
        plugin.permissions.some((permission) =>
          permission.toLowerCase().includes(cleanQuery),
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && plugin.enabled) ||
        (statusFilter === "disabled" && !plugin.enabled);

      const matchesRisk =
        riskFilter === "all" ||
        plugin.risk_level === riskFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        plugin.category === categoryFilter;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesRisk &&
        matchesCategory
      );
    });
  }, [
    plugins,
    query,
    statusFilter,
    riskFilter,
    categoryFilter,
  ]);

  async function togglePlugin(
    pluginKey: string,
    enabled: boolean,
  ) {
    await updatePluginStatusFromStore(
      pluginKey,
      enabled,
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <span>Operations</span>
            <span>·</span>
            <span className="text-cyan-300/80">
              Plugin Registry
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Plugin Management
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Inspect registered O.R.I.O.N. capability modules,
            permissions, risk levels and runtime status.
            Protected safety plugins remain mandatory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tools"
            className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-2.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/[0.08]"
          >
            View Tool Permissions →
          </Link>

          <button
            type="button"
            onClick={() => void loadPlugins()}
            className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw size={14} />
            Refresh registry
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total plugins"
          value={metricValue(metrics, "total_plugins")}
        />

        <MetricCard
          label="Enabled"
          value={metricValue(metrics, "enabled_plugins")}
        />

        <MetricCard
          label="Disabled"
          value={metricValue(metrics, "disabled_plugins")}
        />

        <MetricCard
          label="High-risk enabled"
          value={metricValue(metrics, "high_risk_enabled")}
        />
      </div>

      <GlassPanel className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <label className="relative block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search plugins, categories or permissions..."
              className="w-full rounded-2xl border border-white/[0.08] bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-300/30"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
            className="rounded-2xl border border-white/[0.08] bg-[#0a0d14] px-3 py-2.5 text-sm text-slate-300 outline-none"
          >
            <option value="all">All status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>

          <select
            value={riskFilter}
            onChange={(event) =>
              setRiskFilter(
                event.target.value as RiskFilter,
              )
            }
            className="rounded-2xl border border-white/[0.08] bg-[#0a0d14] px-3 py-2.5 text-sm text-slate-300 outline-none"
          >
            <option value="all">All risk</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            className="rounded-2xl border border-white/[0.08] bg-[#0a0d14] px-3 py-2.5 text-sm text-slate-300 outline-none"
          >
            <option value="all">All categories</option>

            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-3 text-xs text-slate-600">
          Showing {filteredPlugins.length} of {plugins.length}
          {" "}registered plugins
        </p>
      </GlassPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredPlugins.length === 0 ? (
          <GlassPanel className="p-5 xl:col-span-2">
            <p className="text-sm text-slate-500">
              No plugins match the current filters.
            </p>
          </GlassPanel>
        ) : (
          filteredPlugins.map((plugin) => {
            const mappedTools = toolPermissionMatrix.filter(
              (tool) => tool.plugin_key === plugin.key,
            );

            const protectedPlugin =
              PROTECTED_PLUGIN_KEYS.has(plugin.key);

            const loading =
              pluginLoadingKey === plugin.key;

            return (
              <GlassPanel
                key={plugin.key}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/[0.08] text-cyan-200">
                        <Puzzle size={17} />
                      </div>

                      <div>
                        <h2 className="text-sm font-semibold text-white">
                          {plugin.name}
                        </h2>

                        <p className="mt-0.5 text-[11px] text-cyan-300/70">
                          {plugin.key}
                        </p>
                      </div>
                    </div>
                  </div>

                  <RiskBadge
                    risk={plugin.risk_level}
                  />
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {plugin.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {plugin.category}
                  </span>

                  {plugin.built_in && (
                    <span className="rounded-full border border-violet-300/15 bg-violet-300/[0.05] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-violet-300">
                      Built-in
                    </span>
                  )}

                  {protectedPlugin && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-200">
                      <LockKeyhole size={10} />
                      Protected
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                    Permissions
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {plugin.permissions.length === 0 ? (
                      <span className="text-xs text-slate-600">
                        No permissions declared
                      </span>
                    ) : (
                      plugin.permissions.map(
                        (permission) => (
                          <span
                            key={permission}
                            className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[10px] text-slate-400"
                          >
                            {permission}
                          </span>
                        ),
                      )
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                      Mapped tools
                    </p>

                    <span className="text-[10px] text-slate-600">
                      {mappedTools.length}
                    </span>
                  </div>

                  {mappedTools.length === 0 ? (
                    <p className="text-xs text-slate-600">
                      No mapped tools registered for this plugin.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {mappedTools.map((tool) => (
                        <div
                          key={tool.tool_name}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-300">
                              {tool.tool_name}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-600">
                              {tool.risk_level} risk
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                              tool.allowed
                                ? "border-emerald-300/20 text-emerald-200"
                                : "border-red-300/20 text-red-200"
                            }`}
                          >
                            {tool.allowed ? "Allowed" : "Blocked"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                  <div className="flex items-center gap-2">
                    {plugin.enabled ? (
                      <CheckCircle2
                        size={15}
                        className="text-emerald-300"
                      />
                    ) : (
                      <AlertTriangle
                        size={15}
                        className="text-slate-500"
                      />
                    )}

                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        {plugin.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </p>

                      <p className="text-[10px] text-slate-600">
                        {protectedPlugin
                          ? "Required safety component"
                          : "Backend registry state"}
                      </p>
                    </div>
                  </div>

                  {protectedPlugin ? (
                    <div className="flex items-center gap-1.5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-xs font-semibold text-amber-200">
                      <ShieldCheck size={13} />
                      Protected
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        void togglePlugin(
                          plugin.key,
                          !plugin.enabled,
                        )
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                        plugin.enabled
                          ? "border-red-300/20 text-red-200 hover:bg-red-300/[0.06]"
                          : "border-emerald-300/20 text-emerald-200 hover:bg-emerald-300/[0.06]"
                      }`}
                    >
                      {loading
                        ? "Updating…"
                        : plugin.enabled
                          ? "Disable"
                          : "Enable"}
                    </button>
                  )}
                </div>
              </GlassPanel>
            );
          })
        )}
      </div>

      <GlassPanel className="p-5">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
            Plugin Registry Report
          </summary>

          <pre className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-400">
            {report ||
              "No plugin registry report loaded yet."}
          </pre>
        </details>
      </GlassPanel>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <GlassPanel className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-white">
        {value}
      </p>
    </GlassPanel>
  );
}

function RiskBadge({
  risk,
}: {
  risk: string;
}) {
  const className =
    risk === "high"
      ? "border-red-300/20 bg-red-300/[0.06] text-red-200"
      : risk === "medium"
        ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-200"
        : "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${className}`}
    >
      {risk} risk
    </span>
  );
}
