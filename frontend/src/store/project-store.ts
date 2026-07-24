"use client";
import { create } from "zustand";
import { projects as seedProjects } from "@/lib/project-data";
import { OrionProject, TaskColumn } from "@/lib/project-types";
const columns: TaskColumn[] = ["Ideas", "Planning", "In Progress", "Testing", "Completed"];
type ProjectState = { projects: OrionProject[]; selectedId: string; activeTab: string; selectProject: (id: string) => void; setActiveTab: (tab: string) => void; moveTask: (projectId: string, taskId: string) => void };
export const useProjectStore = create<ProjectState>((set) => ({
  projects: seedProjects,
  selectedId: seedProjects[0].id,
  activeTab: "Overview",
  selectProject: (selectedId) => set({ selectedId }),
  setActiveTab: (activeTab) => set({ activeTab }),
  moveTask: (projectId, taskId) => set((state) => ({ projects: state.projects.map((project) => project.id !== projectId ? project : { ...project, logs: [`Moved task ${taskId} to next column`, ...project.logs], tasks: project.tasks.map((task) => { if (task.id !== taskId) return task; const next = Math.min(columns.indexOf(task.column) + 1, columns.length - 1); return { ...task, column: columns[next] }; }) }) })),
}));
