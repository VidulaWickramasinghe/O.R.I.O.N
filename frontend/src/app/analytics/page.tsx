import { AppShell } from "@/components/aurora/app-shell";
import { AnalyticsOverview } from "@/components/aurora/analytics-overview";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1600px]">
        <AnalyticsOverview />
      </div>
    </AppShell>
  );
}
