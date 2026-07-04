"use client";
import { Brain, FileText, ListChecks } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";

export function ContextPanel() {
  const open = useUiStore((state) => state.contextOpen);
  if (!open) return null;
  return (
    <aside className="hidden h-screen w-[320px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#05070B]/70 p-4 backdrop-blur-2xl xl:block">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Context</p>
      <h2 className="mt-3 text-xl font-black text-white">Mission Awareness</h2>
      <div className="mt-4 space-y-3">
        <GlassPanel className="p-4"><div className="flex items-center gap-2 text-white"><Brain className="text-[#61DFFF]" size={18}/> Active Memory</div><p className="mt-3 text-sm text-slate-400">Aurora OS design language, project goals, tool approval policy.</p></GlassPanel>
        <GlassPanel className="p-4"><div className="flex items-center gap-2 text-white"><ListChecks className="text-[#7B5CFF]" size={18}/> Current Plan</div><ol className="mt-3 space-y-2 text-sm text-slate-400"><li>1. Keep execution transparent</li><li>2. Route through safe tools</li><li>3. Validate before commit</li></ol></GlassPanel>
        <GlassPanel className="p-4"><div className="flex items-center gap-2 text-white"><FileText className="text-[#18E299]" size={18}/> Workspace</div><div className="mt-3 flex flex-wrap gap-2"><StatusChip tone="primary">Aurora OS</StatusChip><StatusChip tone="success">Live</StatusChip></div></GlassPanel>
      </div>
    </aside>
  );
}
