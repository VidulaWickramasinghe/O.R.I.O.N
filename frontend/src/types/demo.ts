import type { AuroraPanelId } from "@/types/panels";

export type DemoWalkthroughStep = {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  description: string;
  panelId: AuroraPanelId;
  viewId: "full-mission-control" | "security-view" | "developer-view" | "release-view" | "minimal-view";
  talkingPoints: string[];
  callout: string;
};

export type DemoWalkthroughState = {
  enabled: boolean;
  currentStepIndex: number;
  completed: boolean;
};
