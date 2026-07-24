import { apiGet, apiPost } from "@/lib/api/client";
import type { BackendSidecarStatus } from "@/types/orion";
export type BackendSidecarAction = { status: string; message: string; sidecar: BackendSidecarStatus };
export const getBackendSidecarStatus = () => apiGet<BackendSidecarStatus>("/api/sidecar/status");
export const runBackendSidecarAction = (action: "start" | "stop" | "restart") => apiPost<BackendSidecarAction>(`/api/sidecar/${action}`);
