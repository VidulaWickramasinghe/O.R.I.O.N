"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsUpDown,
  CircleUserRound,
  Command,
  Cpu,
  Hexagon,
  PanelLeftClose,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { navItems } from "@/lib/aurora-data";
import { getMissions } from "@/lib/api/missions";
import { getWorkspaces } from "@/lib/api/workspaces";
import { cn } from "@/lib/utils";
import { useAuroraStore } from "@/store/auroraStore";
import { useUiStore, type SidebarMode } from "@/store/ui-store";
import type { WorkspaceItem } from "@/types/orion";

const groups = [
  { label: "Command", items: ["Dashboard", "Assistant", "Missions", "Agents"] },
  { label: "Intelligence", items: ["Memory", "Projects", "Workspaces", "Workflows", "Analytics"] },
  { label: "Operations", items: ["Tools", "Plugins", "Browser", "Voice", "System", "Security", "Governance", "Console"] },
];

const STORAGE_KEY = "orion-sidebar-mode";
const GROUPS_KEY = "orion-sidebar-groups";

export function Sidebar() {
  const pathname = usePathname();
  const mode = useUiStore((state) => state.sidebarMode);
  const mobileOpen = useUiStore((state) => state.mobileSidebarOpen);
  const setMode = useUiStore((state) => state.setSidebarMode);
  const setMobileOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const userSettingsProfile = useAuroraStore(
    (state) => state.userSettingsProfile,
  );
  const loadUserSettingsProfile = useAuroraStore(
    (state) => state.loadUserSettingsProfile,
  );
  const updateUserSettingFromStore = useAuroraStore(
    (state) => state.updateUserSettingFromStore,
  );
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [missionCount, setMissionCount] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((group) => [group.label, true])),
  );

  const compact = mode === "compact";
  const hidden = mode === "hidden";

  useEffect(() => {
    if (!userSettingsProfile) {
      void loadUserSettingsProfile();
    }
  }, [userSettingsProfile, loadUserSettingsProfile]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setWorkspaceLoading(true);

      try {
        const response = await getWorkspaces();

        if (mounted) {
          setWorkspaces(response.workspaces || []);
        }
      } catch {
        if (mounted) {
          setWorkspaces([]);
        }
      } finally {
        if (mounted) {
          setWorkspaceLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadMissionCount() {
      try {
        const response = await getMissions();

        if (mounted) {
          setMissionCount(response.missions?.length || 0);
        }
      } catch {
        if (mounted) {
          setMissionCount(0);
        }
      }
    }

    void loadMissionCount();

    const timer = window.setInterval(() => {
      void loadMissionCount();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(STORAGE_KEY) as SidebarMode | null;
    if (storedMode && ["expanded", "compact", "hidden"].includes(storedMode)) {
      setMode(storedMode);
    }
    const storedGroups = window.localStorage.getItem(GROUPS_KEY);
    if (storedGroups) {
      try {
        setOpenGroups((current) => ({ ...current, ...(JSON.parse(storedGroups) as Record<string, boolean>) }));
      } catch {
        // Ignore malformed local preferences.
      }
    }
  }, [setMode]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    window.localStorage.setItem(GROUPS_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setMode(mode === "expanded" ? "compact" : "expanded");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, setMode]);

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  const displayName =
    userSettingsProfile?.settings_map?.display_name ||
    "O.R.I.O.N. User";

  const roleTitle =
    userSettingsProfile?.settings_map?.role_title ||
    "System Architect";

  const defaultWorkspaceId =
    userSettingsProfile?.settings_map?.default_workspace_id || "";

  const selectedWorkspace =
    workspaces.find(
      (workspace) =>
        String(workspace.id) === defaultWorkspaceId,
    ) || workspaces[0] || null;

  const environmentMode =
    userSettingsProfile?.settings_map?.environment_mode ||
    "production";

  const environmentLabel =
    environmentMode === "development"
      ? "Development environment"
      : environmentMode === "demo"
        ? "Demo environment"
        : "Production environment";

  async function selectWorkspace(workspaceId: number) {
    await updateUserSettingFromStore(
      "default_workspace_id",
      String(workspaceId),
    );

    setWorkspaceMenuOpen(false);
  }

  async function selectEnvironment(
    environment: "production" | "development" | "demo",
  ) {
    await updateUserSettingFromStore(
      "environment_mode",
      environment,
    );

    setWorkspaceMenuOpen(false);
  }

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        aria-label="Primary navigation"
        className={cn(
          "orion-sidebar fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-white/[0.08] bg-[#080b12]/96 backdrop-blur-2xl transition-[width,transform,opacity] duration-300 ease-out lg:static lg:z-auto lg:translate-x-0",
          hidden ? "lg:w-0 lg:overflow-hidden lg:border-r-0 lg:opacity-0" : compact ? "lg:w-[84px]" : "lg:w-[284px]",
          mobileOpen ? "w-[292px] translate-x-0 opacity-100" : "w-[292px] -translate-x-full",
        )}
      >
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.07] px-3.5">
          <div className="orion-brand-mark relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-200">
            <Hexagon size={22} strokeWidth={1.6} />
            <span className="absolute h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_15px_rgba(103,232,249,0.95)]" />
          </div>

          <div className={cn("min-w-0 flex-1 transition-opacity", compact && "lg:pointer-events-none lg:w-0 lg:opacity-0")}>
            <p className="truncate text-[13px] font-black tracking-[0.32em] text-white">O.R.I.O.N.</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">Mission Control · Aurora OS</p>
          </div>

          <button
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white lg:hidden"
          >
            <X size={17} />
          </button>

          <div className={cn("hidden items-center gap-1 lg:flex", compact && "lg:hidden")}>
            <button
              aria-label="Collapse navigation to icon rail"
              title="Collapse navigation (Ctrl/Cmd+B)"
              onClick={() => setMode("compact")}
              className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/20 hover:bg-white/[0.05] hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Hide navigation"
              title="Hide navigation"
              onClick={() => setMode("hidden")}
              className="rounded-xl border border-white/10 p-2 text-slate-500 transition hover:border-cyan-300/20 hover:bg-white/[0.05] hover:text-white"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          {compact && (
            <button
              aria-label="Expand navigation"
              title="Expand navigation (Ctrl/Cmd+B)"
              onClick={() => setMode("expanded")}
              className="hidden rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/20 hover:bg-white/[0.05] hover:text-white lg:block"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        <div className="p-3">
          <button
            onClick={() => useUiStore.getState().setCommandOpen(true)}
            title={compact ? "Open command centre" : undefined}
            className={cn(
              "group flex w-full items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055] px-3 py-3 text-sm text-cyan-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.09]",
              compact && "lg:justify-center lg:px-0",
            )}
          >
            <Command size={17} className="shrink-0" />
            <span className={cn("min-w-0 flex-1 text-left font-semibold", compact && "lg:hidden")}>Command centre</span>
            <span className={cn("text-[10px] text-cyan-200/60", compact && "lg:hidden")}>⌘K</span>
          </button>
        </div>

        <nav className="orion-scrollbar flex-1 overflow-y-auto px-3 pb-3">
          {groups.map((group) => {
            const isOpen = compact || openGroups[group.label];
            return (
              <div key={group.label} className="mb-3">
                <button
                  type="button"
                  onClick={() => !compact && toggleGroup(group.label)}
                  className={cn(
                    "mb-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600 transition hover:bg-white/[0.025] hover:text-slate-400",
                    compact && "lg:pointer-events-none lg:justify-center lg:px-0",
                  )}
                  aria-expanded={isOpen}
                >
                  <span className={cn("flex-1", compact && "lg:hidden")}>{group.label}</span>
                  <ChevronDown size={12} className={cn("transition-transform", !isOpen && "-rotate-90", compact && "lg:hidden")} />
                  {compact && <span className="hidden h-px w-7 bg-white/[0.08] lg:block" />}
                </button>

                <div className={cn("grid transition-[grid-template-rows,opacity] duration-200", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <div className="min-h-0 overflow-hidden">
                    <div className="space-y-1">
                      {group.items.map((label) => {
                        const item = navItems.find((entry) => entry.label === label);
                        if (!item) return null;
                        const active = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            title={compact ? item.label : undefined}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                              compact && "lg:justify-center lg:px-0",
                              active
                                ? "bg-white/[0.075] text-white"
                                : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100",
                            )}
                          >
                            {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" />}
                            <Icon size={18} className={cn("shrink-0", active ? "text-cyan-200" : "text-slate-500 group-hover:text-slate-300")} />
                            <span className={cn("min-w-0 flex-1", compact && "lg:hidden")}>{item.label}</span>
                            {item.label === "Missions" && missionCount > 0 && (
                              <span
                                className={cn(
                                  "rounded-full bg-cyan-300/10 px-2 py-0.5 text-[10px] text-cyan-200",
                                  compact && "lg:hidden",
                                )}
                                title={`${missionCount} recent mission${
                                  missionCount === 1 ? "" : "s"
                                } returned by backend`}
                              >
                                {missionCount >= 20 ? "20+" : missionCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mb-2 border-t border-white/[0.06] pt-3">
            <p className={cn("mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600", compact && "lg:hidden")}>Manage</p>
            {navItems.filter((item) => ["Settings", "Demo"].includes(item.label)).map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={compact ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "mb-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                    compact && "lg:justify-center lg:px-0",
                    active ? "bg-white/[0.075] text-white" : "text-slate-400 hover:bg-white/[0.045] hover:text-white",
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className={cn(compact && "lg:hidden")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/[0.07] p-3">
          {!compact ? (
            <>
              <div className="relative mb-3">
                <button
                  type="button"
                  aria-expanded={workspaceMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setWorkspaceMenuOpen((open) => !open)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition hover:border-violet-300/20 hover:bg-white/[0.055]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200">
                    <Sparkles size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {selectedWorkspace?.name || "No workspace selected"}
                    </p>

                    <p className="truncate text-[10px] text-slate-500">
                      {environmentLabel}
                    </p>
                  </div>

                  <ChevronsUpDown
                    size={14}
                    className="text-slate-500"
                  />
                </button>

                {workspaceMenuOpen && (
                  <div
                    role="menu"
                    className="absolute bottom-[calc(100%+8px)] left-0 z-[90] w-full rounded-2xl border border-white/[0.1] bg-[#0a0d14]/98 p-2 shadow-2xl backdrop-blur-2xl"
                  >
                    <div className="px-2 pb-2 pt-1">
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
                        Workspace
                      </p>
                    </div>

                    <div className="space-y-1">
                      {workspaceLoading ? (
                        <p className="px-3 py-2 text-xs text-slate-500">
                          Loading workspaces…
                        </p>
                      ) : workspaces.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-500">
                          No registered workspaces
                        </p>
                      ) : (
                        workspaces.map((workspace) => {
                          const active =
                            selectedWorkspace?.id === workspace.id;

                          return (
                            <button
                              key={workspace.id}
                              type="button"
                              role="menuitem"
                              onClick={() => void selectWorkspace(workspace.id)}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                                active
                                  ? "bg-cyan-300/[0.08] text-cyan-100"
                                  : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                              }`}
                            >
                              <span className="truncate">
                                {workspace.name}
                              </span>

                              {active && (
                                <span className="text-[10px] text-cyan-300">
                                  Active
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="my-2 border-t border-white/[0.07]" />

                    <div className="px-2 pb-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
                        Environment
                      </p>
                    </div>

                    {(
                      [
                        ["production", "Production"],
                        ["development", "Development"],
                        ["demo", "Demo"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="menuitem"
                        onClick={() => void selectEnvironment(value)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                          environmentMode === value
                            ? "bg-violet-300/[0.08] text-violet-100"
                            : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <span>{label}</span>

                        {environmentMode === value && (
                          <span className="text-[10px] text-violet-300">
                            Active
                          </span>
                        )}
                      </button>
                    ))}

                    <Link
                      href="/workspaces"
                      onClick={() => setWorkspaceMenuOpen(false)}
                      className="mt-2 block rounded-xl px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-300/[0.05]"
                    >
                      Manage workspaces →
                    </Link>
                  </div>
                )}
              </div>
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/[0.04]"
                aria-label="Open user settings"
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-slate-200"><CircleUserRound size={19} /><span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#080b12] bg-emerald-400" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{displayName}</p><p className="truncate text-[10px] text-slate-500">{roleTitle}</p></div>
                <Settings2 size={15} className="text-slate-500" />
              </Link>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-300" /> Secure</span>
                <span className="flex items-center justify-end gap-1.5"><Cpu size={12} className="text-cyan-300" /> v6.7</span>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <button title="New mission" className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-200"><Plus size={18} /></button>
              <button title="Hide navigation" onClick={() => setMode("hidden")} className="mx-auto hidden h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-slate-500 hover:bg-white/[0.05] hover:text-white lg:flex"><ChevronsLeft size={16} /></button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
