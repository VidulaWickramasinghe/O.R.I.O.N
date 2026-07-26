"use client";

import { useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FolderKanban,
  ListChecks,
  Radio,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { projects } from "@/lib/project-data";
import { toolEvents } from "@/lib/tool-data";
import { memoryItems } from "@/lib/memory-data";

export function ContextPanel() {
  const open = useUiStore((state) => state.contextOpen);
  const setOpen = useUiStore((state) => state.setContextOpen);
  const [tab, setTab] = useState<"context" | "activity">("context");
  const currentProject = projects[0];

  if (!open) return null;

  return (
    <aside className="orion-scrollbar hidden h-dvh w-[344px] shrink-0 overflow-y-auto border-l border-white/[0.07] bg-[#080b12]/88 backdrop-blur-2xl xl:block">
      <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#080b12]/90 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-600">Intelligence rail</p><h2 className="mt-1 text-sm font-semibold text-white">Mission awareness</h2></div>
          <button aria-label="Close context panel" onClick={() => setOpen(false)} className="rounded-xl border border-white/[0.08] p-2 text-slate-500 hover:bg-white/[0.05] hover:text-white"><X size={15} /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 rounded-xl border border-white/[0.07] bg-black/20 p-1">
          <button onClick={() => setTab("context")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === "context" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"}`}>Context</button>
          <button onClick={() => setTab("activity")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === "activity" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"}`}>Activity</button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {tab === "context" ? (
          <>
            <section className="orion-rail-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-300"><FolderKanban size={15} className="text-cyan-200" /> Current project</span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-2 py-1 text-[10px] text-emerald-200">{currentProject.status}</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-white">{currentProject.name}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">{currentProject.description}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full w-[72%] rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" /></div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-600"><span>Release readiness</span><span>72%</span></div>
            </section>

            <section className="orion-rail-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><ListChecks size={15} className="text-violet-300" /> Active execution plan</div>
              <div className="mt-4 space-y-3">
                {["Inspect workspace state", "Validate safety gates", "Execute approved tools", "Generate mission report"].map((step, index) => (
                  <div key={step} className="flex gap-3">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] ${index < 2 ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200" : "border-white/10 text-slate-600"}`}>{index < 2 ? <CheckCircle2 size={11} /> : index + 1}</div>
                    <div className="min-w-0"><p className={`text-xs ${index < 2 ? "text-slate-300" : "text-slate-500"}`}>{step}</p>{index === 2 && <p className="mt-1 text-[10px] text-cyan-300">Awaiting approval</p>}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="orion-rail-card p-4">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Brain size={15} className="text-cyan-200" /> Memory in scope</span><span className="text-[10px] text-slate-600">{memoryItems.length} total</span></div>
              <div className="mt-3 space-y-1.5">
                {memoryItems.slice(0, 4).map((memory) => <button key={memory.id} className="group flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-white/[0.04]"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70" /><span className="min-w-0 flex-1 truncate text-xs text-slate-400 group-hover:text-slate-200">{memory.title}</span><ChevronRight size={12} className="text-slate-700" /></button>)}
              </div>
            </section>

            <section className="orion-rail-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Sparkles size={15} className="text-amber-200" /> Orion recommendation</div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Run the stabilization scan before freezing the next release candidate. Two frontend panels have not been validated in the current session.</p>
              <button className="mt-3 w-full rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/[0.1]">Review recommendation</button>
            </section>
          </>
        ) : (
          <>
            <section className="orion-rail-card p-4">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Activity size={15} className="text-emerald-300" /> Live event stream</span><span className="flex items-center gap-1 text-[10px] text-emerald-300"><Radio size={10} /> Live</span></div>
              <div className="mt-4 space-y-4">
                {toolEvents.slice(0, 7).map((event, index) => (
                  <div key={event.id} className="relative flex gap-3 pl-1">
                    {index < 6 && <span className="absolute left-[7px] top-4 h-[calc(100%+8px)] w-px bg-white/[0.07]" />}
                    <span className={`relative mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === 0 ? "bg-emerald-300 shadow-[0_0_9px_rgba(110,231,183,.7)]" : "bg-slate-600"}`} />
                    <div className="min-w-0 flex-1"><p className="text-xs text-slate-300">{event.title}</p><p className="mt-1 text-[10px] text-slate-600">{event.type} · {index + 1}m ago</p></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="orion-rail-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Clock3 size={15} className="text-violet-300" /> Recent artefacts</div>
              <div className="mt-3 space-y-2">
                {["Stabilization report", "Security policy audit", "Frontend refactor plan"].map((item, index) => <button key={item} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-left hover:border-white/[0.12]"><FileText size={14} className={index === 0 ? "text-cyan-200" : "text-slate-500"} /><span className="flex-1 text-xs text-slate-400">{item}</span><ChevronRight size={12} className="text-slate-700" /></button>)}
              </div>
            </section>

            <section className="orion-rail-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Wrench size={15} className="text-cyan-200" /> Tool runtime</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/[0.035] p-3"><p className="text-lg font-semibold text-white">14</p><p className="mt-1 text-[10px] text-slate-600">Calls today</p></div>
                <div className="rounded-xl bg-white/[0.035] p-3"><p className="text-lg font-semibold text-white">99.2%</p><p className="mt-1 text-[10px] text-slate-600">Success</p></div>
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
