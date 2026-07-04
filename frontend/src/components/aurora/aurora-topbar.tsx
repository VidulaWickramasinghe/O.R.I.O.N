import { Bell, Command, LayoutPanelLeft, Search, Shield } from "lucide-react";

import { Status } from "./aurora-types";
import { AuroraStatusPill } from "./aurora-status-pill";

type AuroraTopbarProps = {
  status: Status | null;
  search: string;
  setSearch: (value: string) => void;
  openCommandPalette: () => void;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
};

export function AuroraTopbar({
  status,
  search,
  setSearch,
  openCommandPalette,
  leftPanelCollapsed,
  rightPanelCollapsed,
  toggleLeftPanel,
  toggleRightPanel,
}: AuroraTopbarProps) {
  void search;
  void setSearch;

  return (
    <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-white/10 bg-[#080D16]/90 px-6 backdrop-blur-xl">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Aurora Workspace</h2>

          <AuroraStatusPill tone={status?.status === "online" ? "green" : "red"}>
            {status?.status === "online" ? "O.R.I.O.N. Live" : "Offline"}
          </AuroraStatusPill>
        </div>

        <p className="mt-1 text-sm text-slate-400">
          Think. Plan. Act. Learn. — AI command environment
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={openCommandPalette}
          className="hidden w-[360px] items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10 lg:flex"
        >
          <Search size={18} className="text-slate-500" />

          <span className="min-w-0 flex-1 text-sm text-slate-500">
            Search or run command
          </span>

          <div className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-500">
            <Command size={12} /> K
          </div>
        </button>

        <AuroraStatusPill tone="violet">GPT-5.5</AuroraStatusPill>

        <button
          onClick={openCommandPalette}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300 hover:bg-white/10 lg:hidden"
        >
          <Search size={18} />
        </button>

        <button className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300 hover:bg-white/10">
          <Shield size={18} />
        </button>

        <button className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300 hover:bg-white/10">
          <Bell size={18} />
        </button>

        <button
          onClick={toggleLeftPanel}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300 hover:bg-white/10"
          title={leftPanelCollapsed ? "Expand left sidebar" : "Collapse left sidebar"}
          aria-pressed={leftPanelCollapsed}
        >
          <LayoutPanelLeft size={18} className={leftPanelCollapsed ? "text-cyan-300" : undefined} />
        </button>

        <button
          onClick={toggleRightPanel}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-300 hover:bg-white/10"
          title={rightPanelCollapsed ? "Expand right context panel" : "Collapse right context panel"}
          aria-pressed={rightPanelCollapsed}
        >
          <LayoutPanelLeft
            size={18}
            className={`rotate-180 ${rightPanelCollapsed ? "text-cyan-300" : ""}`}
          />
        </button>
      </div>
    </header>
  );
}
