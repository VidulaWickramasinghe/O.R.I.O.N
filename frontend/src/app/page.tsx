import { AuroraWorkspace } from "@/components/aurora/aurora-workspace";
import { AuroraQueryProvider } from "@/components/aurora/providers/query-provider";

export default function Home() {
  return (
    <AuroraQueryProvider>
      <AuroraWorkspace />
    </AuroraQueryProvider>
  );
}
