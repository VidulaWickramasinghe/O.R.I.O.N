import { AppShell } from "@/components/aurora/app-shell";
import { WorkflowsLiveWorkspace } from "@/components/aurora/modules/workflows-workspace";

export default function Page() {
  return (
    <AppShell>
      <WorkflowsLiveWorkspace />
    </AppShell>
  );
}
