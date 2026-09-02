import { RecoveryState } from "./RecoveryState";

type WorkspaceStateKind = "loading" | "empty" | "error" | "offline";

export function WorkspaceState({
  kind,
  title,
  description,
  onRetry,
}: {
  kind: WorkspaceStateKind;
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <RecoveryState
      code={kind === "loading" ? "loading" : kind === "offline" ? "backend_offline" : kind === "empty" ? "empty_database" : "tool_failed"}
      title={title}
      description={description}
      actionLabel={onRetry ? "Retry" : undefined}
      onAction={onRetry}
      focusOnChange={kind !== "empty"}
    />
  );
}
