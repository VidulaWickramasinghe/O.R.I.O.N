import { apiGet } from "@/lib/api/client";
import type { ProjectItem } from "@/components/aurora/aurora-types";

export type ProjectsResponse = {
  projects: ProjectItem[];
};

export const getProjects = () => apiGet<ProjectsResponse>("/api/projects");

export const getProject = (projectKey: string) =>
  apiGet<ProjectItem>(`/api/projects/${projectKey}`);
