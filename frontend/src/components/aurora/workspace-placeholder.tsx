import { GlassPanel } from "./glass-panel";
import { StatusChip } from "./status-chip";
export function WorkspacePlaceholder({ phase, title, description }: { phase: string; title: string; description: string }) {
  return <div className="grid h-full place-items-center p-6"><GlassPanel className="max-w-3xl p-8 text-center"><StatusChip tone="primary">{phase}</StatusChip><h1 className="mt-5 text-4xl font-black text-white">{title}</h1><p className="mt-4 text-slate-400">{description}</p><p className="mt-6 text-sm text-slate-500">Future workspace placeholder. The shell, command palette, context, notifications, and AI orb remain active.</p></GlassPanel></div>;
}
