export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; time: string };
export const initialMessages: ChatMessage[] = [
  { id: "m1", role: "assistant", content: "O.R.I.O.N. Assistant online. I can plan, reason, inspect memory, and prepare safe tool actions.", time: "08:42" },
];
export const reasoningSteps = ["Understanding request", "Planning workspace", "Memory lookup", "Generating interface", "Backend connection"];
export const executionSteps = ["Parse intent", "Select agents", "Check approvals", "Prepare tool plan", "Return response"];
export const toolCalls = ["memory.search", "project.context", "safety.review", "ui.compose"];
