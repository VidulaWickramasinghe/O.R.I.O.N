import type { PluginItem } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function PluginSystemPanel({
  plugins,
  metrics,
  report,
  loadingKey,
  message,
  metricValue,
  updatePluginStatus,
}: {
  plugins: PluginItem[];
  metrics: Record<string, unknown>;
  report: string;
  loadingKey: string | null;
  message: string;
  metricValue: (source: Record<string, unknown> | undefined, key: string, fallback?: string) => string;
  updatePluginStatus: (pluginKey: string, enabled: boolean) => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Plugin System</h2>
          <p className="text-sm text-slate-400">
            Tool registry, plugin permissions, risk levels, and module status
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v4.3
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <IntelMetric label="Total" value={metricValue(metrics, "total_plugins")} />
          <IntelMetric label="Enabled" value={metricValue(metrics, "enabled_plugins")} />
          <IntelMetric label="Disabled" value={metricValue(metrics, "disabled_plugins")} />
          <IntelMetric label="High Risk" value={metricValue(metrics, "high_risk_enabled")} />
        </div>

        {message && (
          <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}

        <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          {plugins.length === 0 ? (
            <p className="text-sm text-slate-500">No plugins registered yet.</p>
          ) : (
            plugins.map((plugin) => (
              <div key={plugin.key} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{plugin.name}</h3>
                    <p className="mt-1 text-xs text-cyan-300">
                      {plugin.key} | {plugin.category}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      plugin.risk_level === "high"
                        ? "border-red-400/30 text-red-200"
                        : plugin.risk_level === "medium"
                          ? "border-yellow-400/30 text-yellow-200"
                          : "border-emerald-400/30 text-emerald-200"
                    }`}
                  >
                    {plugin.risk_level}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">{plugin.description}</p>

                <div className="mt-2 flex flex-wrap gap-1">
                  {plugin.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400"
                    >
                      {permission}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                      plugin.enabled
                        ? "border-emerald-400/30 text-emerald-200"
                        : "border-slate-400/30 text-slate-300"
                    }`}
                  >
                    {plugin.enabled ? "enabled" : "disabled"}
                  </span>
                  <button
                    onClick={() => updatePluginStatus(plugin.key, !plugin.enabled)}
                    disabled={loadingKey === plugin.key}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
                      plugin.enabled
                        ? "border-red-400/30 text-red-200 hover:bg-red-500/10"
                        : "border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"
                    }`}
                  >
                    {plugin.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
            Plugin Registry Report
          </summary>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {report || "No plugin registry report loaded yet."}
          </pre>
        </details>

        <p className="text-xs leading-5 text-slate-500">
          Safety: v3.4 tracks plugin metadata, permissions, and enable/disable state. It does not dynamically execute third-party plugin code.
        </p>
      </div>
    </GlassPanel>
  );
}

function IntelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}
