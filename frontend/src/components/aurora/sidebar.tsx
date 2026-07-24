"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ChevronLeft, ChevronRight } from "lucide-react";
import { navItems } from "@/lib/aurora-data";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  return (
    <aside className={cn("flex h-screen shrink-0 flex-col border-r border-white/10 bg-[#05070B]/80 backdrop-blur-2xl transition-all duration-150", collapsed ? "w-[82px]" : "w-[260px]")}> 
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#61DFFF]/30 bg-[#4F8BFF]/15 text-[#61DFFF]"><Bot /></div>
        {!collapsed && <div><p className="font-black tracking-[0.28em] text-white">O.R.I.O.N.</p><p className="text-xs text-slate-500">Aurora OS v2.0</p></div>}
        <button aria-label="Toggle sidebar" onClick={toggleSidebar} className="ml-auto rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white">{collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}</button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-[14px] px-3 py-3 text-sm font-semibold transition duration-150", collapsed && "justify-center", active ? "border border-[#4F8BFF]/45 bg-[#4F8BFF]/15 text-white shadow-[0_0_24px_rgba(79,139,255,0.16)]" : "text-slate-400 hover:bg-white/[0.05] hover:text-white")}><Icon size={18}/>{!collapsed && item.label}</Link>;
        })}
      </nav>
      <div className="space-y-3 border-t border-white/10 p-3 text-xs text-slate-400">
        {!collapsed && <><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="font-bold text-white">Wichel Mercer</p><p>System Architect</p></div><div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">API Status: Operational</div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">Models: GPT-5.5 · Claude · Gemini</div><p>v2.0.0 · Build 2026.07.04</p></>}
      </div>
    </aside>
  );
}
