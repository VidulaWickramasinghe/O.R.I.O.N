import { ApiError } from "@/lib/api/client";

export type RecoveryCode =
  | "first_launch"
  | "loading"
  | "empty_database"
  | "no_projects"
  | "no_workspaces"
  | "no_memories"
  | "no_missions"
  | "backend_offline"
  | "provider_unavailable"
  | "invalid_api_key"
  | "request_interrupted"
  | "corrupt_data"
  | "permission_denied"
  | "approval_rejected"
  | "tool_failed"
  | "mission_failed"
  | "mission_timeout"
  | "mission_cancelled"
  | "workspace_missing"
  | "workspace_invalid"
  | "research_failed"
  | "sidecar_crashed"
  | "permission_changed";

export type RecoveryDescriptor = {
  title: string;
  description: string;
  actionLabel: string;
  urgency: "polite" | "assertive";
};

export const RECOVERY_STATES: Record<RecoveryCode, RecoveryDescriptor> = {
  first_launch: {
    title: "Finish local setup",
    description: "O.R.I.O.N. needs a reachable backend and an available model provider before the first assistant request.",
    actionLabel: "Check system readiness",
    urgency: "polite",
  },
  loading: {
    title: "Loading live state",
    description: "O.R.I.O.N. is waiting for the local service to return current data. No substitute data is being shown.",
    actionLabel: "Cancel loading",
    urgency: "polite",
  },
  empty_database: {
    title: "No local records yet",
    description: "The local database is available but contains no records for this view.",
    actionLabel: "Review available actions",
    urgency: "polite",
  },
  no_projects: {
    title: "No projects registered",
    description: "Register a project before asking O.R.I.O.N. to use project-specific context.",
    actionLabel: "Open projects",
    urgency: "polite",
  },
  no_workspaces: {
    title: "No trusted workspaces",
    description: "Register and approve a local workspace before using workspace or developer actions.",
    actionLabel: "Register a workspace",
    urgency: "polite",
  },
  no_memories: {
    title: "No memories stored",
    description: "No scoped memories are available. O.R.I.O.N. will continue without inventing context.",
    actionLabel: "Open context controls",
    urgency: "polite",
  },
  no_missions: {
    title: "No missions created",
    description: "Create a mission when the work needs durable steps, approvals, and recovery.",
    actionLabel: "Create a mission",
    urgency: "polite",
  },
  backend_offline: {
    title: "Local backend unavailable",
    description: "Aurora OS cannot reach the authenticated O.R.I.O.N. backend. Drafts remain local and no action was executed.",
    actionLabel: "Retry connection",
    urgency: "assertive",
  },
  provider_unavailable: {
    title: "AI provider unavailable",
    description: "The model provider could not complete the request. The conversation can be retried without executing tools again.",
    actionLabel: "Restore draft",
    urgency: "assertive",
  },
  invalid_api_key: {
    title: "Model credentials need attention",
    description: "The configured provider rejected or could not find its API key. O.R.I.O.N. did not continue the request.",
    actionLabel: "Open system settings",
    urgency: "assertive",
  },
  request_interrupted: {
    title: "Request interrupted",
    description: "The request timed out or was cancelled before a result was confirmed. Review current state before retrying a mutation.",
    actionLabel: "Review and retry",
    urgency: "assertive",
  },
  corrupt_data: {
    title: "Local data could not be read safely",
    description: "O.R.I.O.N. detected invalid or corrupt data and stopped instead of guessing at the state.",
    actionLabel: "Open recovery tools",
    urgency: "assertive",
  },
  permission_denied: {
    title: "Permission denied",
    description: "The active capability policy does not allow this action. No side effect was performed.",
    actionLabel: "Review governance",
    urgency: "assertive",
  },
  approval_rejected: {
    title: "Approval rejected",
    description: "The protected action was rejected and its owning step will not continue automatically.",
    actionLabel: "Review mission step",
    urgency: "polite",
  },
  tool_failed: {
    title: "Tool execution failed",
    description: "The tool returned a failure. Review its audit event before choosing a bounded retry.",
    actionLabel: "Open tool audit",
    urgency: "assertive",
  },
  mission_failed: {
    title: "Mission needs intervention",
    description: "A mission step failed and automatic continuation stopped. Retry is explicit and bounded.",
    actionLabel: "Review mission",
    urgency: "assertive",
  },
  mission_timeout: {
    title: "Mission timed out",
    description: "The execution lease expired. O.R.I.O.N. will not continue until the mission is recovered explicitly.",
    actionLabel: "Recover mission",
    urgency: "assertive",
  },
  mission_cancelled: {
    title: "Mission cancelled",
    description: "Cancellation is terminal for the current run and prevents later step execution.",
    actionLabel: "Return to missions",
    urgency: "polite",
  },
  workspace_missing: {
    title: "Workspace no longer exists",
    description: "The registered workspace path is unavailable or was removed outside O.R.I.O.N. No filesystem action was attempted.",
    actionLabel: "Review workspaces",
    urgency: "assertive",
  },
  workspace_invalid: {
    title: "Workspace path is not trusted",
    description: "The selected path is invalid, outside its registered root, or no longer satisfies workspace consent.",
    actionLabel: "Choose a trusted workspace",
    urgency: "assertive",
  },
  research_failed: {
    title: "Browser research failed safely",
    description: "The public destination could not be validated or fetched within the network safety limits.",
    actionLabel: "Edit research request",
    urgency: "assertive",
  },
  sidecar_crashed: {
    title: "Desktop backend stopped",
    description: "The Tauri supervisor detected a backend crash. One automatic restart is attempted before manual recovery is required.",
    actionLabel: "Check supervisor",
    urgency: "assertive",
  },
  permission_changed: {
    title: "Permission changed during execution",
    description: "The active policy changed while work was in progress. The affected step stopped and must be reviewed under the new policy.",
    actionLabel: "Review policy and step",
    urgency: "assertive",
  },
};

export function recoveryFromError(
  error: unknown,
  fallback: RecoveryCode = "tool_failed",
): RecoveryCode {
  const code = error instanceof ApiError ? (error.code ?? "").toLowerCase() : "";
  const status = error instanceof ApiError ? error.status : 0;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  const combined = `${code} ${message}`;

  if (code === "backend_offline" || combined.includes("backend is unavailable")) return "backend_offline";
  if (code === "request_aborted" || combined.includes("timed out") || combined.includes("cancelled")) return "request_interrupted";
  if (combined.includes("api key") || combined.includes("authentication") || combined.includes("credential")) return "invalid_api_key";
  if (combined.includes("provider") || combined.includes("model unavailable")) return "provider_unavailable";
  if (combined.includes("corrupt") || combined.includes("invalid database")) return "corrupt_data";
  if (combined.includes("workspace") && (status === 404 || combined.includes("not found"))) return "workspace_missing";
  if (combined.includes("workspace") && (status === 422 || combined.includes("outside") || combined.includes("trusted"))) return "workspace_invalid";
  if (status === 401 || status === 403 || combined.includes("permission")) return "permission_denied";
  return fallback;
}
