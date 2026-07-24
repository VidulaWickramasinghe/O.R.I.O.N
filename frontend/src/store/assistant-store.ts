"use client";
import { create } from "zustand";
import { ChatMessage, initialMessages } from "@/lib/assistant-data";
type AssistantState = { messages: ChatMessage[]; thinking: boolean; sendMessage: (content: string) => void };
export const useAssistantStore = create<AssistantState>((set) => ({
  messages: initialMessages,
  thinking: false,
  sendMessage: (content) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    set((state) => ({ messages: [...state.messages, { id: crypto.randomUUID(), role: "user", content, time: now }], thinking: true }));
    window.setTimeout(() => set((state) => ({ messages: [...state.messages, { id: crypto.randomUUID(), role: "assistant", content: "Plan prepared. I inspected memory, checked safety constraints, and staged transparent next actions for review.", time: now }], thinking: false })), 650);
  },
}));
