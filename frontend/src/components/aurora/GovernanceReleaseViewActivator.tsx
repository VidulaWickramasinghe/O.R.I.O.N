"use client";

import { useEffect } from "react";
import { useAuroraStore } from "@/store/auroraStore";

export function GovernanceReleaseViewActivator() {
  const activeDashboardView = useAuroraStore((state) => state.activeDashboardView);
  const applyDashboardViewPreset = useAuroraStore((state) => state.applyDashboardViewPreset);

  useEffect(() => {
    if (activeDashboardView !== "release-view") {
      applyDashboardViewPreset("release-view");
    }
  }, [activeDashboardView, applyDashboardViewPreset]);

  return null;
}
