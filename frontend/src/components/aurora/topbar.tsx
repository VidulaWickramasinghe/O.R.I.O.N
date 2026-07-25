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
import { useUiStore } from "@/store/ui-store";

export function Topbar() {
  const [now, setNow] = useState<Date | null>(null);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setNotificationsOpen = useUiStore((state) => state.setNotificationsOpen);
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const sidebarMode = useUiStore((state) => state.sidebarMode);
  const setSidebarMode = useUiStore((state) => state.setSidebarMode);
  const contextOpen = useUiStore((state) => state.contextOpen);
  const setContextOpen = useUiStore((state) => state.setContextOpen);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

        <button className="hidden items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-left lg:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/10 text-violet-200"><ShieldCheck size={15} /></div>
          <div><p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Safety</p><p className="text-xs font-semibold text-slate-300">Approval mode</p></div>
          <ChevronDown size={13} className="text-slate-600" />
        </button>

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
          aria-label="Toggle context panel"
          onClick={() => setContextOpen(!contextOpen)}
          className={`hidden rounded-xl border p-2.5 transition xl:block ${contextOpen ? "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200" : "border-white/[0.08] bg-white/[0.035] text-slate-300 hover:text-white"}`}
        >
          <PanelRight size={18} />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
    </header>
  );
}
