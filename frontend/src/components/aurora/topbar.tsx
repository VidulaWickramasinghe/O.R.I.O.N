"use client";
import { Bell, Command, PanelRight, Search } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { StatusChip } from "./status-chip";

export function Topbar() {
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setNotificationsOpen = useUiStore((state) => state.setNotificationsOpen);
  const contextOpen = useUiStore((state) => state.contextOpen);
  const setContextOpen = useUiStore((state) => state.setContextOpen);
  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 bg-[#05070B]/55 px-5 backdrop-blur-2xl">
      <button onClick={() => setCommandOpen(true)} className="flex w-full max-w-xl items-center gap-3 rounded-[14px] border border-white/10 bg-[#11151D]/80 px-4 py-3 text-left text-sm text-slate-500 hover:border-[#61DFFF]/30">
        <Search size={18}/><span className="flex-1">Search Orion or run command...</span><kbd className="rounded-lg border border-white/10 px-2 py-1 text-xs"><Command size={12} className="inline"/> K</kbd>
      </button>
      <div className="ml-4 flex items-center gap-3">
        <StatusChip tone="success">Assistant Online</StatusChip><StatusChip tone="primary">Claude 3.5 Opus</StatusChip><StatusChip tone="warning">Approval Mode</StatusChip>
        <button aria-label="Open notifications" onClick={() => setNotificationsOpen(true)} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-3 text-slate-300 hover:text-white"><Bell size={18}/></button>
        <button aria-label="Toggle context panel" onClick={() => setContextOpen(!contextOpen)} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-3 text-slate-300 hover:text-white"><PanelRight size={18}/></button>
      </div>
    </header>
  );
}
