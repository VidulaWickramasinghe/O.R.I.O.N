"use client";
import { create } from "zustand";
import { approvals as seedApprovals, toolEvents as seedEvents } from "@/lib/tool-data";
import { ApprovalAction, ToolEvent, ToolType } from "@/lib/tool-types";
type ToolState = { events: ToolEvent[]; approvals: ApprovalAction[]; selectedId: string; filter: ToolType | "all"; query: string; setFilter: (filter: ToolType | "all") => void; setQuery: (query: string) => void; selectEvent: (id: string) => void; decideApproval: (id: string, status: "Approved" | "Rejected") => void };
export const useToolStore = create<ToolState>((set) => ({
  events: seedEvents,
  approvals: seedApprovals,
  selectedId: seedEvents[0].id,
  filter: "all",
  query: "",
  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  selectEvent: (selectedId) => set({ selectedId }),
  decideApproval: (id, status) => set((state) => ({ approvals: state.approvals.map((approval) => approval.id === id ? { ...approval, status } : approval), events: [{ ...state.events[0], id: crypto.randomUUID(), title: `Approval ${status.toLowerCase()}`, description: `Approval ${id} marked ${status}.`, status: status === "Approved" ? "Completed" : "Blocked", tone: status === "Approved" ? "success" : "danger", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...state.events] })),
}));
