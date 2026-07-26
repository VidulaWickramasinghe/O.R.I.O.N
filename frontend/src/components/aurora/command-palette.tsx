"use client";
import { useEffect } from "react";
import { Command, FolderPlus, Logs, Search, Shield, Terminal, Workflow } from "lucide-react";
import { useUiStore } from "@/store/ui-store";

const commands = [
  { label: "Create Project", icon: FolderPlus }, { label: "Run Agent", icon: Workflow }, { label: "Search Memory", icon: Search }, { label: "Open Logs", icon: Logs }, { label: "Open Terminal", icon: Terminal }, { label: "Switch Model", icon: Command }, { label: "Security Review", icon: Shield },
];
export function CommandPalette() {
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); } };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [setOpen]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm" onClick={() => setOpen(false)}><div className="w-full max-w-2xl rounded-[18px] border border-white/10 bg-[#11151D]/95 p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3 border-b border-white/10 px-3 py-3 text-slate-400"><Search size={18}/><input autoFocus className="flex-1 bg-transparent text-sm outline-none" placeholder="Run an Aurora command..." /></div><div className="mt-2 grid gap-1">{commands.map((item) => { const Icon = item.icon; return <button key={item.label} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-300 hover:bg-[#4F8BFF]/12 hover:text-white"><Icon size={17}/>{item.label}</button>; })}</div></div></div>;
}
