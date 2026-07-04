export type ToolType = "browser" | "search" | "file" | "terminal" | "python" | "memory" | "git" | "workflow" | "system";
export type ToolStatus = "Completed" | "Running" | "Queued" | "Waiting Approval" | "Failed" | "Blocked";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type ToolEvent = { id: string; type: ToolType; title: string; description: string; status: ToolStatus; risk: RiskLevel; tool: string; agent: string; project: string; time: string; duration: string; input: string; output: string; reason: string; requiresApproval: boolean; tone: "primary" | "secondary" | "success" | "warning" | "danger" | "muted" };
export type ApprovalAction = { id: string; title: string; description: string; tool: string; requestedBy: string; project: string; risk: RiskLevel; status: "Pending" | "Approved" | "Rejected"; command: string; time: string };
