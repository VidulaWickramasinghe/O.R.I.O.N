#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, RunEvent, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

const MAX_CRASH_RESTARTS: u8 = 1;
const STARTUP_HEALTH_ATTEMPTS: u16 = 120;
const HEALTH_FAILURE_LIMIT: u8 = 3;

#[derive(Default)]
struct RestartBudget {
    restarts: u8,
    stopping: bool,
}

impl RestartBudget {
    fn claim_restart(&mut self) -> bool {
        if self.stopping || self.restarts >= MAX_CRASH_RESTARTS {
            return false;
        }
        self.restarts += 1;
        true
    }
}

#[derive(Default)]
struct HealthTracker {
    healthy_seen: bool,
    consecutive_failures: u8,
}

impl HealthTracker {
    fn observe(&mut self, healthy: bool) -> bool {
        if healthy {
            self.healthy_seen = true;
            self.consecutive_failures = 0;
            return false;
        }
        self.consecutive_failures = self.consecutive_failures.saturating_add(1);
        self.healthy_seen && self.consecutive_failures >= HEALTH_FAILURE_LIMIT
    }
}

struct SupervisorState {
    child: Option<CommandChild>,
    budget: RestartBudget,
    generation: u64,
    status: String,
    last_error: String,
}

impl SupervisorState {
    fn begin_launch(&mut self) -> Option<u64> {
        if self.budget.stopping {
            return None;
        }
        self.generation = self.generation.saturating_add(1);
        self.status = "starting".to_string();
        self.last_error.clear();
        Some(self.generation)
    }

    fn note_termination(&mut self, generation: u64) -> bool {
        if generation != self.generation || self.budget.stopping {
            return false;
        }
        self.child = None;
        self.status = "crashed".to_string();
        self.budget.claim_restart()
    }

    fn begin_shutdown(&mut self) -> Option<CommandChild> {
        self.budget.stopping = true;
        self.generation = self.generation.saturating_add(1);
        self.status = "stopping".to_string();
        self.child.take()
    }
}

#[derive(Clone)]
struct BackendSupervisor {
    inner: Arc<Mutex<SupervisorState>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SupervisorSnapshot {
    generation: u64,
    status: String,
    restarts: u8,
    stopping: bool,
    child_owned: bool,
    last_error: String,
}

impl BackendSupervisor {
    fn snapshot(&self) -> SupervisorSnapshot {
        self.inner
            .lock()
            .map(|state| SupervisorSnapshot {
                generation: state.generation,
                status: state.status.clone(),
                restarts: state.budget.restarts,
                stopping: state.budget.stopping,
                child_owned: state.child.is_some(),
                last_error: state.last_error.clone(),
            })
            .unwrap_or_else(|_| SupervisorSnapshot {
                generation: 0,
                status: "lock_failed".to_string(),
                restarts: 0,
                stopping: false,
                child_owned: false,
                last_error: "Backend supervisor lock was poisoned.".to_string(),
            })
    }

    fn generation_is_active(&self, generation: u64) -> bool {
        self.inner
            .lock()
            .map(|state| {
                state.generation == generation && !state.budget.stopping && state.child.is_some()
            })
            .unwrap_or(false)
    }

    fn mark_healthy(&self, generation: u64) {
        if let Ok(mut state) = self.inner.lock() {
            if state.generation == generation && !state.budget.stopping {
                state.status = "healthy".to_string();
                state.last_error.clear();
            }
        }
    }

    fn terminate_unhealthy(&self, generation: u64, reason: &str) {
        let child = self.inner.lock().ok().and_then(|mut state| {
            if state.generation != generation || state.budget.stopping {
                return None;
            }
            state.status = "unhealthy".to_string();
            state.last_error = reason.to_string();
            state.child.take()
        });
        if let Some(child) = child {
            let _ = child.kill();
        }
    }
}

struct DesktopState {
    token: String,
    base_url: String,
    supervisor: BackendSupervisor,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApiSessionResponse {
    base_url: String,
    token: String,
}

#[tauri::command]
fn get_api_session(state: State<'_, DesktopState>) -> ApiSessionResponse {
    ApiSessionResponse {
        base_url: state.base_url.clone(),
        token: state.token.clone(),
    }
}

#[tauri::command]
fn get_backend_supervisor_status(state: State<'_, DesktopState>) -> SupervisorSnapshot {
    state.supervisor.snapshot()
}

fn reserve_available_port() -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|error| format!("Unable to reserve a loopback backend port: {error}"))?;
    listener
        .local_addr()
        .map(|address| address.port())
        .map_err(|error| format!("Unable to read the reserved backend port: {error}"))
}

fn backend_is_healthy(port: u16) -> bool {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(500)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));
    if stream
        .write_all(b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
        .is_err()
    {
        return false;
    }
    let mut response = [0_u8; 256];
    match stream.read(&mut response) {
        Ok(length) if length > 0 => String::from_utf8_lossy(&response[..length])
            .lines()
            .next()
            .is_some_and(|line| line.contains(" 200 ")),
        _ => false,
    }
}

fn monitor_backend_health(port: u16, generation: u64, supervisor: BackendSupervisor) {
    thread::spawn(move || {
        let mut tracker = HealthTracker::default();
        let mut startup_attempts = 0_u16;
        loop {
            thread::sleep(Duration::from_millis(500));
            if !supervisor.generation_is_active(generation) {
                return;
            }
            let healthy = backend_is_healthy(port);
            if healthy {
                supervisor.mark_healthy(generation);
            }
            if tracker.observe(healthy) {
                supervisor.terminate_unhealthy(
                    generation,
                    "Backend health checks failed after a previously healthy launch.",
                );
                return;
            }
            if !tracker.healthy_seen {
                startup_attempts = startup_attempts.saturating_add(1);
            }
            if !tracker.healthy_seen && startup_attempts >= STARTUP_HEALTH_ATTEMPTS {
                supervisor.terminate_unhealthy(
                    generation,
                    "Backend did not become healthy before the startup deadline.",
                );
                return;
            }
        }
    });
}

fn launch_backend(
    app: AppHandle,
    token: String,
    data_dir: PathBuf,
    port: u16,
    supervisor: BackendSupervisor,
) -> Result<(), String> {
    let generation = {
        let mut state = supervisor
            .inner
            .lock()
            .map_err(|_| "Backend supervisor lock was poisoned.".to_string())?;
        state
            .begin_launch()
            .ok_or_else(|| "Backend supervisor is shutting down.".to_string())?
    };
    let sidecar = app
        .shell()
        .sidecar("orion-backend")
        .map_err(|error| format!("Unable to resolve the backend sidecar: {error}"))?
        .env("ORION_CAPABILITY_TOKEN", token.clone())
        .env("ORION_DATA_DIR", data_dir.as_os_str())
        .env("ORION_BACKEND_PORT", port.to_string());
    let (mut receiver, child) = sidecar
        .spawn()
        .map_err(|error| format!("Unable to launch the backend sidecar: {error}"))?;

    {
        let mut state = supervisor
            .inner
            .lock()
            .map_err(|_| "Backend supervisor lock was poisoned.".to_string())?;
        if state.generation != generation || state.budget.stopping {
            let _ = child.kill();
            return Err("Backend launch was superseded by shutdown.".to_string());
        }
        state.child = Some(child);
    }

    monitor_backend_health(port, generation, supervisor.clone());
    tauri::async_runtime::spawn(async move {
        while let Some(event) = receiver.recv().await {
            if matches!(event, CommandEvent::Terminated(_)) {
                let should_restart = supervisor
                    .inner
                    .lock()
                    .map(|mut state| state.note_termination(generation))
                    .unwrap_or(false);
                if should_restart {
                    if let Err(error) =
                        launch_backend(app, token, data_dir, port, supervisor.clone())
                    {
                        if let Ok(mut state) = supervisor.inner.lock() {
                            state.status = "restart_failed".to_string();
                            state.last_error = error;
                        }
                    }
                }
                break;
            }
        }
    });
    Ok(())
}

fn stop_backend(state: &DesktopState) {
    let child = state
        .supervisor
        .inner
        .lock()
        .ok()
        .and_then(|mut supervisor| supervisor.begin_shutdown());
    if let Some(child) = child {
        let _ = child.kill();
    }
    if let Ok(mut supervisor) = state.supervisor.inner.lock() {
        supervisor.status = "stopped".to_string();
    }
}

fn main() {
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_api_session,
            get_backend_supervisor_status
        ])
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let backend_port = reserve_available_port().map_err(std::io::Error::other)?;
            let token = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
            let supervisor = BackendSupervisor {
                inner: Arc::new(Mutex::new(SupervisorState {
                    child: None,
                    budget: RestartBudget::default(),
                    generation: 0,
                    status: "not_started".to_string(),
                    last_error: String::new(),
                })),
            };
            app.manage(DesktopState {
                token: token.clone(),
                base_url: format!("http://127.0.0.1:{backend_port}"),
                supervisor: supervisor.clone(),
            });
            launch_backend(
                app.handle().clone(),
                token,
                data_dir,
                backend_port,
                supervisor,
            )
            .map_err(std::io::Error::other)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building O.R.I.O.N. Aurora OS desktop shell");

    application.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            stop_backend(&app_handle.state::<DesktopState>());
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state(generation: u64) -> SupervisorState {
        SupervisorState {
            child: None,
            budget: RestartBudget::default(),
            generation,
            status: "healthy".to_string(),
            last_error: String::new(),
        }
    }

    #[test]
    fn crash_restart_budget_allows_exactly_one_restart() {
        let mut budget = RestartBudget::default();
        assert!(budget.claim_restart());
        assert!(!budget.claim_restart());
    }

    #[test]
    fn stale_generation_cannot_claim_restart_or_replace_the_active_child() {
        let mut supervisor = state(4);
        assert!(!supervisor.note_termination(3));
        assert_eq!(supervisor.generation, 4);
        assert_eq!(supervisor.budget.restarts, 0);
        assert_eq!(supervisor.status, "healthy");
    }

    #[test]
    fn shutdown_never_consumes_restart_budget() {
        let mut supervisor = state(8);
        supervisor.begin_shutdown();
        assert!(!supervisor.note_termination(8));
        assert_eq!(supervisor.budget.restarts, 0);
        assert!(supervisor.budget.stopping);
    }

    #[test]
    fn unhealthy_child_is_reaped_only_after_a_confirmed_healthy_period() {
        let mut tracker = HealthTracker::default();
        assert!(!tracker.observe(false));
        assert!(!tracker.observe(true));
        assert!(!tracker.observe(false));
        assert!(!tracker.observe(false));
        assert!(tracker.observe(false));
    }
}
