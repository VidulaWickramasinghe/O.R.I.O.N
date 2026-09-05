import { describe, expect, it } from "vitest";

import {
  isMissionActive,
  operationalMissionStatus,
  operationalStatusLabel,
} from "@/lib/mission-status";

describe("shared operational mission vocabulary", () => {
  it.each([
    ["planned", "draft", "Draft"],
    ["ready", "ready", "Ready"],
    ["in_progress", "running", "Running"],
    ["waiting_approval", "waiting_for_approval", "Waiting for approval"],
    ["paused", "paused", "Paused"],
    ["recovery_required", "blocked", "Blocked"],
    ["failed", "failed", "Failed"],
    ["canceled", "cancelled", "Cancelled"],
    ["completed", "complete", "Complete"],
  ])("maps backend state %s to %s", (backend, canonical, label) => {
    expect(operationalMissionStatus(backend)).toBe(canonical);
    expect(operationalStatusLabel(backend)).toBe(label);
  });

  it("fails visibly for unknown state and does not treat it as active", () => {
    expect(operationalMissionStatus("invented-state")).toBeNull();
    expect(operationalStatusLabel("invented-state")).toBe("Unavailable");
    expect(isMissionActive("invented-state")).toBe(false);
  });

  it.each(["ready", "running", "waiting_approval", "paused", "blocked"])(
    "keeps controllable state %s in the active mission set",
    (status) => expect(isMissionActive(status)).toBe(true),
  );
});
