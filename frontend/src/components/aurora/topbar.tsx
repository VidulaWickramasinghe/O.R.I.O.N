"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  Command,
  Menu,
  PanelLeft,
  PanelLeftOpen,
  PanelRight,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useAuroraStore } from "@/store/auroraStore";
import { useUiStore } from "@/store/ui-store";

export function Topbar() {
  const [now, setNow] = useState<Date | null>(null);
  const [safetyMenuOpen, setSafetyMenuOpen] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<string | null>(null);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setNotificationsOpen = useUiStore((state) => state.setNotificationsOpen);
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const sidebarMode = useUiStore((state) => state.sidebarMode);
  const setSidebarMode = useUiStore((state) => state.setSidebarMode);
  const contextOpen = useUiStore((state) => state.contextOpen);
  const setContextOpen = useUiStore((state) => state.setContextOpen);
  const securityProfiles = useAuroraStore(
    (state) => state.securityProfiles,
  );
  const securityPolicyActive = useAuroraStore(
    (state) => state.securityPolicyActive,
  );
  const securityPolicyLoadingKey = useAuroraStore(
    (state) => state.securityPolicyLoadingKey,
  );
  const loadSecurityPolicy = useAuroraStore(
    (state) => state.loadSecurityPolicy,
  );
  const applySecurityProfileFromStore = useAuroraStore(
    (state) => state.applySecurityProfileFromStore,
  );

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void loadSecurityPolicy();
  }, [loadSecurityPolicy]);

  const activeProfileKey = String(
    securityPolicyActive?.active_profile ||
    "strict",
  );

  const activeProfile = securityProfiles.find(
    (profile) => profile.key === activeProfileKey,
  );

  const activeProfileLabel = activeProfile?.name || "Strict Mode";

  async function requestSecurityProfile(profileKey: string) {
    if (profileKey === activeProfileKey) {
      setSafetyMenuOpen(false);
      return;
    }

    if (profileKey === "strict") {
      await applySecurityProfileFromStore(profileKey);
      setSafetyMenuOpen(false);
      return;
    }

    setPendingProfile(profileKey);
  }

  async function confirmSecurityProfileChange() {
    if (!pendingProfile) return;

    await applySecurityProfileFromStore(pendingProfile);

    setPendingProfile(null);
    setSafetyMenuOpen(false);
  }

  return (
    <header className="orion-topbar relative z-30 flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#080b12]/72 px-3 backdrop-blur-2xl sm:px-5">
      <button
        aria-label="Open navigation"
        onClick={() => setMobileSidebarOpen(true)}
        className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5 text-slate-300 hover:bg-white/[0.06] hover:text-white lg:hidden"
      >
        <Menu size={19} />
      </button>

      <button
        aria-label={sidebarMode === "hidden" ? "Show navigation" : "Toggle navigation width"}
        title={sidebarMode === "hidden" ? "Show navigation" : "Toggle navigation width (Ctrl/Cmd+B)"}
        onClick={() => setSidebarMode(sidebarMode === "hidden" ? "expanded" : sidebarMode === "expanded" ? "compact" : "expanded")}
        className={`hidden rounded-xl border p-2.5 transition lg:inline-flex ${sidebarMode === "hidden" ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200" : "border-white/[0.08] bg-white/[0.035] text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
      >
        {sidebarMode === "hidden" ? <PanelLeftOpen size={18} /> : <PanelLeft size={18} />}
      </button>

      <button
        onClick={() => setCommandOpen(true)}
        className="group flex min-w-0 max-w-[620px] flex-1 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-2.5 text-left text-sm text-slate-500 transition hover:border-cyan-300/20 hover:bg-white/[0.05] sm:px-4"
      >
        <Search size={17} className="shrink-0 text-slate-500 group-hover:text-cyan-200" />
        <span className="truncate">Search missions, memory, agents or run a command</span>
        <kbd className="ml-auto hidden items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-slate-500 sm:flex"><Command size={10} />K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 xl:flex">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
          <span className="text-xs font-medium text-slate-300">All systems nominal</span>
        </div>

        <div className="relative hidden lg:block">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={safetyMenuOpen}
            onClick={() => setSafetyMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-left transition hover:border-violet-300/20 hover:bg-white/[0.05]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/10 text-violet-200">
              <ShieldCheck size={15} />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
                Safety
              </p>

              <p className="text-xs font-semibold text-slate-300">
                {securityPolicyLoadingKey
                  ? "Applying…"
                  : activeProfileLabel}
              </p>
            </div>

            <ChevronDown
              size={13}
              className={`text-slate-600 transition ${
                safetyMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {safetyMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-[95] w-[330px] rounded-2xl border border-white/[0.1] bg-[#0a0d14]/98 p-3 shadow-2xl backdrop-blur-2xl"
            >
              <div className="px-2 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300/70">
                  Security profile
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Profiles control plugin availability.
                  Approval gates remain enforced.
                </p>
              </div>

              <div className="space-y-2">
                {securityProfiles.map((profile) => {
                  const active = profile.key === activeProfileKey;

                  return (
                    <button
                      key={profile.key}
                      type="button"
                      role="menuitem"
                      disabled={securityPolicyLoadingKey !== null}
                      onClick={() =>
                        void requestSecurityProfile(profile.key)
                      }
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-cyan-300/20 bg-cyan-300/[0.07]"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`text-sm font-semibold ${
                            active
                              ? "text-cyan-100"
                              : "text-slate-200"
                          }`}
                        >
                          {profile.name}
                        </span>

                        {active && (
                          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-300">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {profile.description}
                      </p>

                      <div className="mt-2 flex gap-3 text-[10px] text-slate-600">
                        <span>
                          Enabled {profile.enabled_plugin_count}
                        </span>

                        <span>
                          Disabled {profile.disabled_plugin_count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="hidden min-w-[92px] text-right 2xl:block">
          <p className="font-mono text-xs font-semibold text-slate-200">{now ? now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">Melbourne · AEST</p>
        </div>

        <button
          aria-label="Open notifications"
          onClick={() => setNotificationsOpen(true)}
          className="relative rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5 text-slate-300 hover:bg-white/[0.06] hover:text-white"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#0b0e15] bg-rose-400" />
        </button>
        <button
          type="button"
          aria-label={
            contextOpen
              ? "Close Live Context panel"
              : "Open Live Context panel"
          }
          aria-expanded={contextOpen}
          aria-controls="orion-live-context-panel"
          title={
            contextOpen
              ? "Close Live Context"
              : "Open Live Context"
          }
          onClick={() => setContextOpen(!contextOpen)}
          className={`hidden rounded-xl border p-2.5 transition xl:block ${
            contextOpen
              ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200"
              : "border-white/[0.08] bg-white/[0.035] text-slate-300 hover:border-cyan-300/20 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <PanelRight size={18} />
        </button>
      </div>

      {pendingProfile && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm security profile change"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0b0e15] p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-200">
                <ShieldCheck size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Change security profile?
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  This may enable additional plugins.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Approval gates remain enforced. This change affects
              plugin availability only.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingProfile(null)}
                className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void confirmSecurityProfileChange()}
                className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-200"
              >
                Confirm change
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
    </header>
  );
}
