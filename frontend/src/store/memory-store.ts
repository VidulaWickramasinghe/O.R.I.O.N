"use client";
import { create } from "zustand";
import { memoryItems } from "@/lib/memory-data";
import { MemoryCategory, MemoryItem } from "@/lib/memory-types";
type MemoryState = { memories: MemoryItem[]; selectedId: string; query: string; category: MemoryCategory; setQuery: (query: string) => void; setCategory: (category: MemoryCategory) => void; selectMemory: (id: string) => void; togglePin: (id: string) => void };
export const useMemoryStore = create<MemoryState>((set) => ({
  memories: memoryItems,
  selectedId: memoryItems[0].id,
  query: "",
  category: "All Memory",
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  selectMemory: (selectedId) => set({ selectedId }),
  togglePin: (id) => set((state) => ({ memories: state.memories.map((memory) => memory.id === id ? { ...memory, pinned: !memory.pinned } : memory) })),
}));
