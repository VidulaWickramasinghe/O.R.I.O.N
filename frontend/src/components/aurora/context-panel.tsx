"use client";
import { Brain, FileText, FolderKanban, ListChecks, MonitorCog, Radio, Wrench } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { projects } from "@/lib/project-data";
import { toolEvents } from "@/lib/tool-data";
import { memoryItems } from "@/lib/memory-data";
import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";

export function ContextPanel() {
  const open = useUiStore((state) => state.contextOpen);
  const currentProject = projects[0];

  if (!open) return null;

  return (
    <aside className="hidden h-screen w-[340px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#05070B]/70 p-4 backdrop-blur-2xl xl:block">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Context</p>
      <h2 className="mt-3 text-xl font-black text-white">Mission Awareness</h2>

      <div className="mt-4 space-y-3">
        <GlassPanel className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white">
              <FolderKanban className="text-[#61DFFF]" size={18} /> Current Project
            </div>
            <StatusChip tone="success">{currentProject.status}</StatusChip>
          </div>
          <p className="mt-3 font-bold text-white">{currentProject.name}</p>
          <p className="mt-2 text-sm text-slate-400">{currentProject.description}</p>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-2 text-white">
            <Brain className="text-[#61DFFF]" size={18} /> Memory Used
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-400">
            {memoryItems.slice(0, 3).map((memory) => (
              <p key={memory.id}>{memory.title}</p>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-2 text-white">
            <ListChecks className="text-[#7B5CFF]" size={18} /> Execution Plan
          </div>
          <ol className="mt-3 space-y-2 text-sm text-slate-400">
            <li>1. Preserve legacy Aurora modules</li>
            <li>2. Merge new OS shell routes</li>
            <li>3. Keep tools and approvals visible</li>
            <li>4. Prepare backend integration</li>
          </ol>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-2 text-white">
            <Wrench className="text-[#18E299]" size={18} /> Live Tool Feed
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-400">
            {toolEvents.slice(0, 5).map((event) => (
              <p key={event.id}>
                <span className="text-[#61DFFF]">{event.type}</span> — {event.title}
              </p>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-2 text-white">
            <MonitorCog className="text-[#61DFFF]" size={18} /> Workspaces
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-400">
            <p>Aurora OS</p>
            <p>O.R.I.O.N. Backend</p>
            <p>Voice Layer</p>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-2 text-white">
            <FileText className="text-[#18E299]" size={18} /> Legacy + New Modules
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusChip tone="primary">Missions</StatusChip>
            <StatusChip tone="primary">Browser</StatusChip>
            <StatusChip tone="primary">Voice</StatusChip>
            <StatusChip tone="primary">Demo</StatusChip>
            <StatusChip tone="success">New OS Shell</StatusChip>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-2 text-white">
            <Radio className="text-[#18E299]" size={18} /> System Status
          </div>
          <p className="mt-3 text-sm text-slate-400">API Status: Operational · Models connected · Safety approval mode visible.</p>
        </GlassPanel>
      </div>
    </aside>
  );
}
