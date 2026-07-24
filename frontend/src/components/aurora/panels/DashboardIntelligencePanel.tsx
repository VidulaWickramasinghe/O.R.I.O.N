import { metricValue, scoreTone } from "@/lib/format";
import type { DashboardIntelligence } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/ui/GlassPanel";
import { MetricCard } from "@/components/aurora/ui/MetricCard";

export function DashboardIntelligencePanel({ intelligence, loading, message, onRefresh }: {
  intelligence: DashboardIntelligence | null; loading: boolean; message: string; onRefresh: () => void;
}) {
  return <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold text-white">Dashboard Intelligence</h2><p className="text-sm text-slate-400">System scores, mission analytics, risk state, and readiness signals</p></div><span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">v4.2</span></div>
    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
      <button onClick={onRefresh} disabled={loading} className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60">{loading ? "Analyzing..." : "Refresh Intelligence"}</button>
      {message && <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">{message}</p>}
      {!intelligence ? <p className="text-sm text-slate-500">Dashboard intelligence has not loaded yet.</p> : <>
        <div className={`rounded-2xl border p-4 ${scoreTone(intelligence.intelligence_score)}`}><p className="text-xs uppercase tracking-[0.25em]">Intelligence Score</p><div className="mt-3 flex items-end justify-between gap-3"><span className="text-5xl font-black">{intelligence.intelligence_score}</span><span className="text-sm uppercase tracking-[0.25em]">{intelligence.readiness_label}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-current" style={{ width: `${intelligence.intelligence_score}%` }} /></div></div>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Missions" value={metricValue(intelligence.mission_metrics, "total_missions")} /><MetricCard label="Mission Runs" value={metricValue(intelligence.mission_metrics, "mission_runs")} />
          <MetricCard label="Workspaces" value={metricValue(intelligence.workspace_metrics, "total_workspaces")} /><MetricCard label="Knowledge Docs" value={metricValue(intelligence.memory_metrics, "knowledge_documents")} />
          <MetricCard label="Vectors" value={metricValue(intelligence.memory_metrics, "vector_items")} /><MetricCard label="Pending Approvals" value={metricValue(intelligence.risk_metrics, "pending_approvals")} />
          <MetricCard label="Total Reminders" value={metricValue(intelligence.notification_metrics, "total_reminders")} /><MetricCard label="Due Reminders" value={metricValue(intelligence.notification_metrics, "due_reminders")} />
          <MetricCard label="Safety Level" value={intelligence.user_settings?.safety_level || "strict"} /><MetricCard label="Voice Mode" value={intelligence.user_settings?.voice_mode || "text_first"} />
          <MetricCard label="Plugins" value={metricValue(intelligence.plugin_metrics, "total_plugins")} /><MetricCard label="Enabled Plugins" value={metricValue(intelligence.plugin_metrics, "enabled_plugins")} />
          <MetricCard label="Mapped Tools" value={metricValue(intelligence.tool_permission_metrics, "total_mapped_tools")} /><MetricCard label="Allowed Tools" value={metricValue(intelligence.tool_permission_metrics, "allowed_tools")} />
          <MetricCard label="Audit Events" value={metricValue(intelligence.tool_audit_metrics, "total_audit_events")} /><MetricCard label="Blocked Audits" value={metricValue(intelligence.tool_audit_metrics, "blocked_events")} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Recommendations</p><div className="mt-3 space-y-2">{intelligence.recommendations.map((item) => <p key={item} className="rounded-xl border border-white/10 bg-black/30 p-2 text-xs leading-5 text-slate-300">{item}</p>)}</div></div>
        <details className="rounded-2xl border border-white/10 bg-white/5 p-3"><summary className="cursor-pointer text-sm font-semibold text-cyan-200">Full Intelligence Report</summary><pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">{intelligence.report}</pre></details>
      </>}
    </div>
  </GlassPanel>;
}
