import { AppShell } from "@/components/aurora/app-shell";
import { MemoryWorkspace } from "@/components/aurora/modules/memory-workspace";

export default function ContextPage() {
  return (
    <AppShell>
      <MemoryWorkspace />
    </AppShell>
  );
}
