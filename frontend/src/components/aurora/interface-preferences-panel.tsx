"use client";

import { Clock3, Eye, LayoutPanelLeft, RotateCcw, Sparkles } from "lucide-react";

import { GlassPanel } from "@/components/aurora/glass-panel";
import { PetPreferenceControl } from "@/components/aurora/pet-preference-control";
import { useUiStore } from "@/store/ui-store";

export function InterfacePreferencesPanel() {
  const sidebarMode = useUiStore((state) => state.sidebarMode);
  const setSidebarMode = useUiStore((state) => state.setSidebarMode);
  const contextOpen = useUiStore((state) => state.contextOpen);
  const setContextOpen = useUiStore((state) => state.setContextOpen);
  const reducedMotion = useUiStore((state) => state.reducedMotion);
  const setReducedMotion = useUiStore((state) => state.setReducedMotion);
  const uiDensity = useUiStore((state) => state.uiDensity);
  const setUiDensity = useUiStore((state) => state.setUiDensity);
  const use24HourTime = useUiStore((state) => state.use24HourTime);
  const setUse24HourTime = useUiStore((state) => state.setUse24HourTime);
  const setPetVisible = useUiStore((state) => state.setPetVisible);

  const resetInterface = () => {
    setSidebarMode("expanded");
    setContextOpen(true);
    setPetVisible(true);
    setReducedMotion(false);
    setUiDensity("comfortable");
    setUse24HourTime(true);
  };

  return (
    <GlassPanel className="border-cyan-300/15 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
            This device
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            Aurora interface preferences
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            These controls take effect immediately and remain local to this
            browser or desktop session. They do not weaken O.R.I.O.N. policy or
            approval gates.
          </p>
        </div>

        <button
          type="button"
          onClick={resetInterface}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-300/20 hover:bg-white/5 hover:text-white"
        >
          <RotateCcw size={14} aria-hidden="true" /> Reset interface
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <PetPreferenceControl />
        <PreferenceToggle
          label="Show left sidebar"
          description="Keep complete product navigation visible. Ctrl/Cmd+B also toggles it."
          icon={LayoutPanelLeft}
          enabled={sidebarMode === "expanded"}
          onChange={(enabled) =>
            setSidebarMode(enabled ? "expanded" : "hidden")
          }
        />
        <PreferenceToggle
          label="Show Live Context"
          description="Display mission, approval, workspace, and memory context in the right rail."
          icon={Eye}
          enabled={contextOpen}
          onChange={setContextOpen}
        />
        <PreferenceToggle
          label="Reduce motion"
          description="Minimise decorative animation and shorten interface transitions."
          icon={Sparkles}
          enabled={reducedMotion}
          onChange={setReducedMotion}
        />
        <PreferenceToggle
          label="Use 24-hour time"
          description="Show operational time in 24-hour format in the command bar."
          icon={Clock3}
          enabled={use24HourTime}
          onChange={setUse24HourTime}
        />

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200">
            <LayoutPanelLeft size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">
              Interface density
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Choose comfortable spacing or a denser operations view.
            </span>
          </span>
          <select
            aria-label="Interface density"
            value={uiDensity}
            onChange={(event) =>
              setUiDensity(
                event.target.value === "compact" ? "compact" : "comfortable",
              )
            }
            className="rounded-xl border border-cyan-300/15 bg-[#070b12] px-3 py-2 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300/30"
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </div>
    </GlassPanel>
  );
}

function PreferenceToggle({
  label,
  description,
  icon: Icon,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  icon: typeof Eye;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          enabled
            ? "border-cyan-300/40 bg-cyan-400/30"
            : "border-white/10 bg-white/[0.06]"
        }`}
      >
        <span
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
