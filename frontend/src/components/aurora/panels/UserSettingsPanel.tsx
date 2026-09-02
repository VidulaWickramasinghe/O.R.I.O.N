"use client";

import { useState } from "react";
import {
  Bot,
  Palette,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import type { UserSettingItem, UserSettingsProfile } from "@/types/orion";

const FIELD_LABELS: Record<string, string> = {
  display_name: "Display name",
  role_title: "Role or title",
  environment_mode: "Environment mode",
  default_workspace_id: "Default workspace ID",
  safety_level: "Safety profile",
  voice_mode: "Voice behaviour",
  theme_mode: "Aurora theme",
  preferred_model: "Preferred model",
  developer_mode_enabled: "Developer mode",
  demo_mode_preference: "Prefer portfolio demo mode",
  startup_briefing_enabled: "Startup briefing",
};

const BOOLEAN_FIELDS = new Set([
  "developer_mode_enabled",
  "demo_mode_preference",
  "startup_briefing_enabled",
]);

const SETTING_GROUPS = [
  {
    id: "identity",
    title: "Identity & workspace",
    description: "How Aurora identifies you and which trusted workspace opens by default.",
    icon: UserRound,
    keys: [
      "display_name",
      "role_title",
      "environment_mode",
      "default_workspace_id",
    ],
  },
  {
    id: "assistant",
    title: "Assistant & startup",
    description: "Model preference, voice posture, and startup behaviour.",
    icon: Bot,
    keys: ["preferred_model", "voice_mode", "startup_briefing_enabled"],
  },
  {
    id: "appearance",
    title: "Appearance & presentation",
    description: "Aurora visual theme and portfolio presentation preference.",
    icon: Palette,
    keys: ["theme_mode", "demo_mode_preference"],
  },
  {
    id: "governance",
    title: "Safety & developer access",
    description: "Security posture and explicit developer-mode preference.",
    icon: ShieldCheck,
    keys: ["safety_level", "developer_mode_enabled"],
  },
] as const;

function optionLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  setProfile: (
    updater: (
      current: UserSettingsProfile | null,
    ) => UserSettingsProfile | null,
  ) => void;
  updateSetting: (key: string, value: string) => void;
  resetSettings: () => void;
}) {
  const [resetArmed, setResetArmed] = useState(false);
  const settingsByKey = new Map(
    (profile?.settings ?? []).map((setting) => [setting.key, setting]),
  );

  const updateDraft = (key: string, value: string) => {
    setProfile((current) => {
      if (!current) return current;
      return {
        ...current,
        settings_map: { ...current.settings_map, [key]: value },
        settings: current.settings.map((item) =>
          item.key === key ? { ...item, value } : item,
        ),
      };
    });
  };

  return (
    <div className="space-y-5">
      <GlassPanel className="border-cyan-400/15 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
              Backend profile
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              O.R.I.O.N. user configuration
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Every supported profile setting is organised below. Changes are
              validated by the backend settings registry and capability gateway.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
            <p className="text-2xl font-black text-cyan-100">
              {profile?.settings.length ?? 0}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              supported settings
            </p>
          </div>
        </div>

        {message && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100"
          >
            {message}
          </p>
        )}
      </GlassPanel>

      {!profile ? (
        <GlassPanel className="p-6">
          <p className="text-sm font-semibold text-white">
            Backend profile unavailable
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Start the local backend and refresh this page to edit governed
            profile, model, voice, theme, and safety settings. Device-only
            interface controls remain available below.
          </p>
        </GlassPanel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {SETTING_GROUPS.map((group) => {
            const Icon = group.icon;
            const groupSettings = group.keys
              .map((key) => settingsByKey.get(key))
              .filter((setting): setting is UserSettingItem => Boolean(setting));

            return (
              <GlassPanel key={group.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold text-white">{group.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {group.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {groupSettings.map((setting) => (
                    <SettingField
                      key={setting.key}
                      setting={setting}
                      loading={loadingKey === setting.key}
                      updateDraft={updateDraft}
                      updateSetting={updateSetting}
                    />
                  ))}
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}

      {profile && (
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white">Reset backend profile</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Restore all governed profile fields to safe defaults. API keys,
                credentials, memories, and missions are not stored here.
              </p>
            </div>

            {resetArmed ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResetArmed(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loadingKey === "reset"}
                  onClick={() => {
                    resetSettings();
                    setResetArmed(false);
                  }}
                  className="rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-2 text-xs font-bold text-rose-100 hover:bg-rose-400/15 disabled:opacity-60"
                >
                  Confirm reset
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setResetArmed(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-rose-300/25 hover:bg-rose-400/[0.06] hover:text-rose-100"
              >
                <RotateCcw size={14} aria-hidden="true" /> Reset profile
              </button>
            )}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

function SettingField({
  setting,
  loading,
  updateDraft,
  updateSetting,
}: {
  setting: UserSettingItem;
  loading: boolean;
  updateDraft: (key: string, value: string) => void;
  updateSetting: (key: string, value: string) => void;
}) {
  const label = FIELD_LABELS[setting.key] || optionLabel(setting.key);

  if (BOOLEAN_FIELDS.has(setting.key)) {
    const enabled = setting.value === "true";
    return (
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={loading}
        onClick={() => updateSetting(setting.key, String(!enabled))}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.035] disabled:opacity-60"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-100">
            {label}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {setting.description}
          </span>
        </span>
        <SwitchVisual enabled={enabled} />
      </button>
    );
  }

  return (
    <label className="block rounded-2xl border border-white/10 bg-black/20 p-4">
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold text-slate-100">
            {label}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {setting.description}
          </span>
        </span>
        {loading && (
          <span className="text-[10px] uppercase tracking-wider text-cyan-300">
            Saving…
          </span>
        )}
      </span>

      {setting.options.length > 0 ? (
        <select
          value={setting.value}
          disabled={loading}
          onChange={(event) => updateSetting(setting.key, event.target.value)}
          className="mt-3 w-full rounded-xl border border-cyan-400/20 bg-[#070b12] px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400/30"
        >
          {setting.options.map((option) => (
            <option key={option} value={option}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={setting.key === "default_workspace_id" ? "number" : "text"}
          min={setting.key === "default_workspace_id" ? 1 : undefined}
          value={setting.value}
          disabled={loading}
          placeholder={
            setting.key === "default_workspace_id"
              ? "Leave empty for no default"
              : undefined
          }
          onChange={(event) => updateDraft(setting.key, event.target.value)}
          onBlur={(event) => updateSetting(setting.key, event.target.value)}
          className="mt-3 w-full rounded-xl border border-cyan-400/20 bg-[#070b12] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400/30"
        />
      )}
    </label>
  );
}

export function SwitchVisual({ enabled }: { enabled: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
        enabled
          ? "border-cyan-300/40 bg-cyan-400/30"
          : "border-white/10 bg-white/[0.06]"
      }`}
    >
      <span
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition ${
          enabled ? "left-6" : "left-1"
        }`}
      />
    </span>
  );
}
