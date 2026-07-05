import {
  BarChart3,
  Bot,
  Brain,
  Briefcase,
  FolderKanban,
  Gauge,
  Globe2,
  Home,
  Lock,
  MessageSquare,
  Mic,
  MonitorCog,
  Terminal,
  Wrench,
} from "lucide-react";

import { AuroraView } from "./aurora-types";

type NavItem = {
  id: AuroraView;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "assistant", label: "Assistant", icon: MessageSquare },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "missions", label: "Missions", icon: Briefcase },
  { id: "workspaces", label: "Workspaces", icon: MonitorCog },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "browser", label: "Browser", icon: Globe2 },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "security", label: "Security", icon: Lock },
  { id: "system", label: "System", icon: Gauge },
  { id: "demo", label: "Demo", icon: BarChart3 },
  { id: "console", label: "Console", icon: Terminal },
];

type AuroraSidebarProps = {
  activeView: AuroraView;
  setActiveView: (view: AuroraView) => void;
  apiOnline: boolean;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

export function AuroraSidebar({
  activeView,
  setActiveView,
  apiOnline,
  collapsed,
  setCollapsed,
}: AuroraSidebarProps) {
  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-white/10 bg-[#05070B]/95 transition-all duration-300 ${
        collapsed ? "w-[84px]" : "w-[280px]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
            <Bot size={24} />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-[0.28em] text-white">
                O.R.I.O.N.
              </h1>
              <p className="text-xs text-slate-400">Aurora OS</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Collapse sidebar"
          >
            <MonitorCog size={16} />
          </button>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Expand sidebar"
          >
            <MonitorCog size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "border border-cyan-400/30 bg-cyan-400/10 text-white shadow-lg shadow-cyan-500/10"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4">
        <div
          className={`rounded-3xl border border-white/10 bg-white/[0.05] ${
            collapsed ? "p-3 text-center" : "p-4"
          }`}
        >
          {!collapsed && <p className="text-xs text-slate-500">API Status</p>}

          <p
            className={`text-sm font-bold ${
              collapsed ? "mt-0" : "mt-2"
            } ${apiOnline ? "text-emerald-300" : "text-red-300"}`}
          >
            {collapsed ? (apiOnline ? "●" : "●") : apiOnline ? "Online" : "Offline"}
          </p>

          {!collapsed && <p className="mt-2 text-xs text-slate-500">Aurora v3.6</p>}
        </div>
      </div>
    </aside>
  );
}
