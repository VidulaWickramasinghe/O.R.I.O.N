import type { SecurityPolicyEventItem, SecurityProfileItem } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function SecurityPolicyPanel({
  activePolicy,
  profiles,
  events,
  report,
  loadingKey,
  message,
  applyProfile,
}: {
  activePolicy: Record<string, unknown>;
  profiles: SecurityProfileItem[];
  events: SecurityPolicyEventItem[];
  report: string;
  loadingKey: string | null;
  message: string;
  applyProfile: (profileKey: string) => void;
}) {
  const activeProfile = activePolicy.profile as { name?: string; safety_level?: string } | undefined;
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Security Policy</h2>
          <p className="text-sm text-slate-400">
            Strict, Balanced, and Developer Lab risk modes for plugin control
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">v4.3</span>
      </div>
      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Active Policy</p>
          <p className="mt-3 text-2xl font-black text-slate-100">
            {String(activeProfile?.name || activePolicy.active_profile || "Not loaded")}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Safety Level: {String(activeProfile?.safety_level || "unknown")}
          </p>
        </div>
        {message && (
          <p className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {message}
          </p>
        )}
        <div className="grid gap-3">
          {profiles.length === 0 ? (
            <p className="text-sm text-slate-500">Security profiles have not loaded yet.</p>
          ) : (
            profiles.map((profile) => (
              <div key={profile.key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{profile.name}</h3>
                    <p className="mt-1 text-xs text-cyan-300">{profile.key} | {profile.safety_level}</p>
                  </div>
                  <button
                    onClick={() => applyProfile(profile.key)}
                    disabled={loadingKey === profile.key}
                    className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                  >
                    {loadingKey === profile.key ? "Applying" : "Apply"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{profile.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2">
                    <p className="text-xs text-emerald-200">Enables {profile.enabled_plugin_count}</p>
                  </div>
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-2">
                    <p className="text-xs text-red-200">Disables {profile.disabled_plugin_count}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">Recent Policy Events</summary>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">No policy events yet.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-sm font-semibold text-slate-100">{event.profile_name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{event.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.created_at} | {event.source}</p>
                </div>
              ))
            )}
          </div>
        </details>
        <details className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">Security Policy Report</summary>
          <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {report || "No security policy report loaded yet."}
          </pre>
        </details>
        <p className="text-xs leading-5 text-slate-500">
          Safety: policy profiles control plugin states only. They do not bypass approval gates.
        </p>
      </div>
    </GlassPanel>
  );
}
