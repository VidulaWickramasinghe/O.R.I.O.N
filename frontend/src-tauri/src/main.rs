#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, RunEvent, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

const MAX_CRASH_RESTARTS: u8 = 1;

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

struct SupervisorState {
    child: Option<CommandChild>,
    budget: RestartBudget,
}

#[derive(Clone)]
struct BackendSupervisor {
    inner: Arc<Mutex<SupervisorState>>,
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

fn reserve_available_port() -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|error| format!("Unable to reserve a loopback backend port: {error}"))?;
    listener
        .local_addr()
        .map(|address| address.port())
        .map_err(|error| format!("Unable to read the reserved backend port: {error}"))
}

fn launch_backend(
    app: AppHandle,
    token: String,
    data_dir: PathBuf,
    port: u16,
    supervisor: BackendSupervisor,
) -> Result<(), String> {
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
        let mut state = supervisor.inner.lock().map_err(|_| "Backend supervisor lock was poisoned.")?;
        state.child = Some(child);
    }

    tauri::async_runtime::spawn(async move {
        while let Some(event) = receiver.recv().await {
            if matches!(event, CommandEvent::Terminated(_)) {
                let should_restart = supervisor
                    .inner
                    .lock()
                    .map(|mut state| {
                        state.child = None;
                        state.budget.claim_restart()
                    })
                    .unwrap_or(false);
                if should_restart {
                    let _ = launch_backend(app, token, data_dir, port, supervisor);
                }
                break;
            }
        }
    });
    Ok(())
}

fn stop_backend(state: &DesktopState) {
    if let Ok(mut supervisor) = state.supervisor.inner.lock() {
        supervisor.budget.stopping = true;
        if let Some(child) = supervisor.child.take() {
            let _ = child.kill();
        }
    }
}

fn main() {
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_api_session])
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let backend_port = reserve_available_port().map_err(std::io::Error::other)?;
            let token = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
            let supervisor = BackendSupervisor {
                inner: Arc::new(Mutex::new(SupervisorState {
                    child: None,
                    budget: RestartBudget::default(),
                })),
            };
            app.manage(DesktopState {
                token: token.clone(),
                base_url: format!("http://127.0.0.1:{backend_port}"),
                supervisor: supervisor.clone(),
            });
            launch_backend(app.handle().clone(), token, data_dir, backend_port, supervisor)
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

    #[test]
    fn crash_restart_budget_allows_exactly_one_restart() {
        let mut budget = RestartBudget::default();
        assert!(budget.claim_restart());
        assert!(!budget.claim_restart());
    }

    #[test]
    fn shutdown_never_consumes_restart_budget() {
        let mut budget = RestartBudget { restarts: 0, stopping: true };
        assert!(!budget.claim_restart());
        assert_eq!(budget.restarts, 0);
    }
}
