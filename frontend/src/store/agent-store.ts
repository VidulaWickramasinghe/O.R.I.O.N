"use client";
import { create } from "zustand";
import { agents as seedAgents, OrionAgent, AgentStatus } from "@/lib/agent-data";
type AgentState = { agents: OrionAgent[]; selectedId: string; selectAgent: (id: string) => void; setStatus: (id: string, status: AgentStatus) => void };
export const useAgentStore = create<AgentState>((set) => ({
  agents: seedAgents,
  selectedId: seedAgents[0].id,
  selectAgent: (selectedId) => set({ selectedId }),
  setStatus: (id, status) => set((state) => ({ agents: state.agents.map((agent) => agent.id === id ? { ...agent, status } : agent) })),
}));
