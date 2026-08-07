"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { StatusChip } from "@/components/aurora/status-chip";
import { UserSettingsPanel } from "@/components/aurora/panels/UserSettingsPanel";
import {
  getUserSettingsProfile,
  resetUserSettings,
  updateUserSetting,
} from "@/lib/api/settings";
import type { UserSettingsProfile } from "@/types/orion";

function valueFromMap(
  profile: UserSettingsProfile | null,
  key: string,
  fallback = "Unavailable",
) {
  const value = profile?.settings_map?.[key];
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function SettingsLiveWorkspace() {
  const [profile, setProfileState] = useState<UserSettingsProfile | null>(null);
  const [loadingKey, setLoadingKey] = useState("");
  const [message, setMessage] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  const loadSettings = useCallback(async () => {
    setLoadingKey("profile");
    setMessage("");

    try {
      const data = await getUserSettingsProfile();
      setProfileState(data);
      setLastLoadedAt(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      setProfileState(null);
      setMessage("User settings failed to load. Confirm the backend is running.");
    } finally {
      setLoadingKey("");
    }
  }, []);

  async function handleUpdateSetting(key: string, value: string) {
    setLoadingKey(key);
    setMessage("");

    try {
      await updateUserSetting(key, value);
      const data = await getUserSettingsProfile();
      setProfileState(data);
      setMessage(`Setting updated: ${key}`);
    } catch {
      setMessage(`Setting update failed: ${key}`);
    } finally {
      setLoadingKey("");
    }
  }

  async function handleResetSettings() {
    setLoadingKey("reset");
    setMessage("");

    try {
      const data = await resetUserSettings();
      setProfileState(data);
      setMessage("User settings reset to backend defaults.");
    } catch {
      setMessage("User settings reset failed.");
    } finally {
      setLoadingKey("");
    }
  }

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const settingsCount = profile?.settings?.length || 0;

  const quickStats = useMemo(
    () => [
      {
        label: "Safety level",
        value: valueFromMap(profile, "safety_level", "Not loaded"),
        detail: "Backend user setting",
      },
      {
        label: "Voice mode",
        value: valueFromMap(profile, "voice_mode", "Not loaded"),
        detail: "Backend user setting",
      },
      {
        label: "Developer mode",
        value: valueFromMap(profile, "developer_mode_enabled", "Not loaded"),
        detail: "Backend user setting",
      },
      {
        label: "Theme mode",
        value: valueFromMap(profile, "theme_mode", "Not loaded"),
        detail: "Backend user setting",
      },
    ],
    [profile],
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-3xl border border-cyan-300/15 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Live user settings
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              Backend profile and preferences
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Manage supported local O.R.I.O.N. profile settings through the
              backend settings API. This route does not use the old static form,
              fake saved state, or unsupported setting writes.
            </p>
          </div>

          <button
            onClick={() => void loadSettings()}
            disabled={Boolean(loadingKey)}
            className="rounded-xl border border-cyan-400/30 px-4 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <RefreshCw className="inline" size={15} />{" "}
            {loadingKey === "profile" ? "Refreshing..." : "Refresh settings"}
          </button>
        </div>
      </header>

      {message && (
        <p
          role="alert"
          className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4 text-sm leading-6 text-cyan-100"
        >
          {message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        {quickStats.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
          />
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <UserSettingsPanel
            profile={profile}
            loadingKey={loadingKey}
            message={message}
            setProfile={(updater) => {
              setProfileState((current) => updater(current));
            }}
            updateSetting={handleUpdateSetting}
            resetSettings={handleResetSettings}
          />
        </div>

        <aside className="space-y-5">
          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Settings2 size={18} className="text-cyan-300" />
              Settings source
            </h2>

            <div className="mt-4 space-y-3">
              <SourceRow
                label="/api/settings/profile"
                status={profile ? "Loaded" : loadingKey ? "Loading" : "Unavailable"}
              />

              <SourceRow
                label="/api/settings/profile/{setting_key}"
                status="Supported"
              />

              <SourceRow
                label="/api/settings/profile/reset"
                status="Supported"
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Last refresh: {lastLoadedAt || "Unchecked"}
            </p>
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <SlidersHorizontal size={18} className="text-violet-300" />
              Profile summary
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {profile?.profile_summary || "No backend profile summary loaded."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip tone={profile ? "success" : "muted"}>
                {settingsCount} settings
              </StatusChip>
              <StatusChip tone="primary">Backend controlled</StatusChip>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck size={18} className="text-emerald-300" />
              Settings safety boundary
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              This page only reads and updates settings supported by the backend
              user-settings registry. It does not store secrets, API keys, or
              credentials in the settings database.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip tone="success">Supported backend fields only</StatusChip>
              <StatusChip tone="warning">No secrets in settings</StatusChip>
              <StatusChip tone="primary">Local profile preferences</StatusChip>
            </div>
          </GlassPanel>
        </aside>
      </div>
    </div>
  );
}

function SourceRow({ label, status }: { label: string; status: string }) {
  const tone =
    status === "Loaded" || status === "Supported"
      ? "success"
      : status === "Loading"
        ? "warning"
        : "muted";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
      <span className="break-all text-xs text-slate-400">{label}</span>
      <StatusChip tone={tone}>{status}</StatusChip>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 break-words text-2xl font-black text-cyan-100">
        {value}
      </p>
      <p className="mt-2 break-words text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </div>
  );
}
