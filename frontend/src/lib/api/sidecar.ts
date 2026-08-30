import { invoke, isTauri } from "@tauri-apps/api/core";
import { apiGet } from "@/lib/api/client";
import { runtimeConfig } from "@/lib/config/runtime";
import type { BackendSidecarStatus } from "@/types/orion";

type SupervisorSnapshot = {
  generation: number;
  status: string;
  restarts: number;
  stopping: boolean;
  childOwned: boolean;
  lastError: string;
};

function supervisorFallback(snapshot: SupervisorSnapshot): BackendSidecarStatus {
  return {
    managed_by: "Tauri Rust Supervisor",
    status: snapshot.status,
    pid: null,
    host: "127.0.0.1",
    port: 0,
    backend_url: runtimeConfig.apiBaseUrl,
    started_at: "",
    updated_at: new Date().toISOString(),
    last_error: snapshot.lastError,
    pid_running: snapshot.childOwned,
    port_open: snapshot.status === "healthy",
    log_file: "",
    state_file: "",
    report: "Supervisor state is provided directly by the Tauri process.",
    generation: snapshot.generation,
    restarts: snapshot.restarts,
    stopping: snapshot.stopping,
    child_owned: snapshot.childOwned,
    supervisor_owned: true,
  };
}

export async function getBackendSidecarStatus(): Promise<BackendSidecarStatus> {
  if (typeof window === "undefined" || !isTauri()) {
    return apiGet<BackendSidecarStatus>("/api/sidecar/status");
  }

  const snapshot = await invoke<SupervisorSnapshot>("get_backend_supervisor_status");
  const backend = await apiGet<BackendSidecarStatus>("/api/sidecar/status").catch(() => null);
  return {
    ...(backend ?? supervisorFallback(snapshot)),
    managed_by: "Tauri Rust Supervisor",
    status: snapshot.status,
    last_error: snapshot.lastError || backend?.last_error || "",
    pid_running: snapshot.childOwned,
    port_open: snapshot.status === "healthy" && (backend?.port_open ?? true),
    generation: snapshot.generation,
    restarts: snapshot.restarts,
    stopping: snapshot.stopping,
    child_owned: snapshot.childOwned,
    supervisor_owned: true,
  };
}
