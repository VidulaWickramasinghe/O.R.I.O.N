export type RecordingSceneId = "opening" | "dashboard" | "security" | "developer" | "release" | "portfolio" | "closing";
export type RecordingModeState = { enabled: boolean; sceneId: RecordingSceneId; startedAt: string; showLargeCallout: boolean; hideNoisyPanels: boolean; showTimer: boolean; checklistOpen: boolean; };
export type RecordingScene = { id: RecordingSceneId; title: string; subtitle: string; viewId: "full-mission-control" | "security-view" | "developer-view" | "release-view" | "minimal-view"; callout: string; checklist: string[]; };
