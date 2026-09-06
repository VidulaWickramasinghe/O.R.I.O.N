import { useQuery } from "@tanstack/react-query";

import {
  ActivityEvent,
  ApprovalItem,
  DemoStatus,
  MemoryItem,
  MissionItem,
  MissionRunItem,
  ProjectItem,
  Status,
  VoiceStatus,
  WorkspaceItem,
} from "../aurora-types";
import { api } from "@/lib/api/client";
import { getDashboardIntelligence } from "@/lib/api/dashboard";
import { getPersistenceOverview } from "@/lib/api/persistence";
import { getNotificationEvents } from "@/lib/api/notifications";
import { getUserSettingsProfile } from "@/lib/api/settings";
import { getSecurityPolicy } from "@/lib/api/security";

type StatusResponse = Status;

type ActivityResponse = {
  events: ActivityEvent[];
};

type ProjectsResponse = {
  projects: ProjectItem[];
};

type WorkspacesResponse = {
  workspaces: WorkspaceItem[];
};

type MemoryResponse = {
  items: MemoryItem[];
};

type MissionsResponse = {
  missions: MissionItem[];
};

type MissionRunsResponse = {
  runs: MissionRunItem[];
};

type ApprovalsResponse = {
  approvals: ApprovalItem[];
};

export type ApprovalStatus = "pending" | "executing" | "approved" | "rejected" | "failed";

export function useAuroraStatus() {
  return useQuery({
    queryKey: ["aurora-status"],
    queryFn: () => api.get<StatusResponse>("/api/status"),
    refetchInterval: 30000,
  });
}

export function useAuroraActivity() {
  return useQuery({
    queryKey: ["aurora-activity"],
    queryFn: () => api.get<ActivityResponse>("/api/activity"),
  });
}

export function useAuroraNotificationEvents() {
  return useQuery({
    queryKey: ["aurora-notification-events"],
    queryFn: getNotificationEvents,
    refetchInterval: 30000,
  });
}

export function useAuroraUserSettings() {
  return useQuery({
    queryKey: ["aurora-user-settings"],
    queryFn: getUserSettingsProfile,
  });
}

export function useAuroraSecurityPolicy(refetchInterval: number | false = false) {
  return useQuery({
    queryKey: ["aurora-security-policy"],
    queryFn: getSecurityPolicy,
    refetchInterval,
  });
}

export function useAuroraProjects() {
  return useQuery({
    queryKey: ["aurora-projects"],
    queryFn: () => api.get<ProjectsResponse>("/api/projects"),
  });
}

export function useAuroraWorkspaces() {
  return useQuery({
    queryKey: ["aurora-workspaces"],
    queryFn: () => api.get<WorkspacesResponse>("/api/workspaces"),
  });
}

export function useAuroraMemory() {
  return useQuery({
    queryKey: ["aurora-memory"],
    queryFn: () => api.get<MemoryResponse>("/api/memory"),
  });
}

export function useAuroraMissions(refetchInterval: number | false = false) {
  return useQuery({
    queryKey: ["aurora-missions"],
    queryFn: () => api.get<MissionsResponse>("/api/missions"),
    refetchInterval,
  });
}

export function useAuroraMissionRuns() {
  return useQuery({
    queryKey: ["aurora-mission-runs"],
    queryFn: () => api.get<MissionRunsResponse>("/api/mission-runs"),
  });
}

export function useAuroraApprovals(statuses?: ApprovalStatus[], refetchInterval: number | false = false) {
  const statusKey = statuses?.join(",") || "all";
  return useQuery({
    queryKey: ["aurora-approvals", statusKey],
    refetchInterval,
    queryFn: async () => {
      if (!statuses?.length) {
        return api.get<ApprovalsResponse>("/api/approvals", { query: { limit: 100 } });
      }
      const responses = await Promise.all(
        statuses.map((status) =>
          api.get<ApprovalsResponse>("/api/approvals", {
            query: { status, limit: 100 },
          }),
        ),
      );
      return {
        approvals: responses
          .flatMap((response) => response.approvals)
          .sort((left, right) => right.id - left.id),
      };
    },
  });
}

export function useAuroraVoiceStatus() {
  return useQuery({
    queryKey: ["aurora-voice-status"],
    queryFn: () => api.get<VoiceStatus>("/api/voice/status"),
  });
}

export function useAuroraDemoStatus() {
  return useQuery({
    queryKey: ["aurora-demo-status"],
    queryFn: () => api.get<DemoStatus>("/api/demo/status"),
  });
}

export function useAuroraDashboardIntelligence() {
  return useQuery({
    queryKey: ["aurora-dashboard-intelligence"],
    queryFn: getDashboardIntelligence,
  });
}

export function useAuroraPersistence() {
  return useQuery({
    queryKey: ["aurora-persistence"],
    queryFn: getPersistenceOverview,
  });
}
