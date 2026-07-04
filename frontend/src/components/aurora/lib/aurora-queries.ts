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
import { api } from "./api-client";

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

export function useAuroraStatus() {
  return useQuery({
    queryKey: ["aurora-status"],
    queryFn: () => api.get<StatusResponse>("/api/status"),
  });
}

export function useAuroraActivity() {
  return useQuery({
    queryKey: ["aurora-activity"],
    queryFn: () => api.get<ActivityResponse>("/api/activity"),
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

export function useAuroraMissions() {
  return useQuery({
    queryKey: ["aurora-missions"],
    queryFn: () => api.get<MissionsResponse>("/api/missions"),
  });
}

export function useAuroraMissionRuns() {
  return useQuery({
    queryKey: ["aurora-mission-runs"],
    queryFn: () => api.get<MissionRunsResponse>("/api/mission-runs"),
  });
}

export function useAuroraApprovals() {
  return useQuery({
    queryKey: ["aurora-approvals"],
    queryFn: () => api.get<ApprovalsResponse>("/api/approvals"),
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
