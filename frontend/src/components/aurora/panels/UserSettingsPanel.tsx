import type { UserSettingsProfile } from "@/types/orion";
import { GlassPanel } from "@/components/aurora/glass-panel";

export function UserSettingsPanel({
  profile,
  loadingKey,
  message,
  setProfile,
  updateSetting,
  resetSettings,
}: {
  profile: UserSettingsProfile | null;
  loadingKey: string | null;
  message: string;
  setProfile: (updater: (current: UserSettingsProfile | null) => UserSettingsProfile | null) => void;
  updateSetting: (key: string, value: string) => void;
  resetSettings: () => void;
}) {
  return (
    <GlassPanel className="border-cyan-400/20 bg-white/[0.06] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">User Profile + Settings</h2>
          <p className="text-sm text-slate-400">
            Local preferences, safety level, workspace defaults, voice, theme, and model mode
          </p>
        </div>
        <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
          v4.3
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        {!profile ? (
          <p className="text-sm text-slate-500">User settings have not loaded yet.</p>
        ) : (
          <>
            {message && (
              <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                {message}
              </p>
            )}

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Profile Summary</p>
              <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
                {profile.profile_summary}
              </pre>
            </div>

            <div className="space-y-3">
              {profile.settings.map((setting) => (
                <div key={setting.key} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{setting.key}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{setting.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-500">{setting.updated_at}</span>
                  </div>

                  {setting.options.length > 0 ? (
                    <select
                      value={setting.value}
                      disabled={loadingKey === setting.key}
                      onChange={(event) => updateSetting(setting.key, event.target.value)}
                      className="w-full rounded-xl border border-cyan-400/20 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400/30"
                    >
                      {setting.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={setting.value}
                      disabled={loadingKey === setting.key}
                      onChange={(event) => {
                        setProfile((current) => {
                          if (!current) return current;
                          return {
                            ...current,
                            settings: current.settings.map((item) =>
                              item.key === setting.key ? { ...item, value: event.target.value } : item
                            ),
                          };
                        });
                      }}
                      onBlur={(event) => updateSetting(setting.key, event.target.value)}
                      className="w-full rounded-xl border border-cyan-400/20 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400/30"
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={resetSettings}
              disabled={loadingKey === "reset"}
              className="w-full rounded-2xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
            >
              Reset Settings
            </button>

            <p className="text-xs leading-5 text-slate-500">
              Safety: profile settings are local preferences only. Keep API keys and secrets inside .env, not in this settings database.
            </p>
          </>
        )}
      </div>
    </GlassPanel>
  );
}
