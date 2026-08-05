import { AppShell } from "@/components/aurora/app-shell";
import { SystemLiveWorkspace } from "@/components/aurora/modules/system-workspace";

export default function Page() {
  return (
    <AppShell>
      <SystemLiveWorkspace />
    </AppShell>
  );
}
