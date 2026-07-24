import { MemoryCategory, MemoryItem } from "./memory-types";
export const memoryCategories: MemoryCategory[] = ["All Memory", "Projects", "Preferences", "Skills", "Conversations", "Files", "Tools", "System"];
export const memoryItems: MemoryItem[] = [
  { id: "mem-1", title: "Aurora OS design language", content: "Dark glass panels, transparent execution, command-center layout, and semantic status colors.", category: "Projects", source: "Design brief", project: "Aurora OS", confidence: 96, lastUpdated: "Today", pinned: true, tags: ["ui", "aurora", "design"], tone: "primary" },
  { id: "mem-2", title: "User prefers explicit tool logs", content: "Always show what agent is acting, why the tool is used, and what requires approval.", category: "Preferences", source: "Conversation", project: "O.R.I.O.N.", confidence: 92, lastUpdated: "Today", pinned: true, tags: ["safety", "ux"], tone: "success" },
  { id: "mem-3", title: "Agent runtime architecture", content: "Planner, Researcher, Coder, Tester, Documentation, Memory Manager, Security Guardian, Deployment.", category: "System", source: "Workspace spec", project: "O.R.I.O.N.", confidence: 89, lastUpdated: "Yesterday", pinned: false, tags: ["agents", "runtime"], tone: "secondary" },
  { id: "mem-4", title: "Tool approval policy", content: "Terminal, file writes, browser automation, and git operations should be visible and cancelable.", category: "Tools", source: "Safety layer", project: "O.R.I.O.N. Backend", confidence: 94, lastUpdated: "2 days ago", pinned: false, tags: ["approval", "tools"], tone: "warning" },
];
