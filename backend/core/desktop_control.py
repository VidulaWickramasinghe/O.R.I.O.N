import shutil
import subprocess
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from core.approvals import create_approval_request, get_approval_request
from core.capability_gateway import requires_gateway
from core.workspace_manager import get_trusted_workspace_record
from core.workspace_commands import package_script_plan, revalidate_package_script
from core.runtime_paths import runtime_data_dir


ALLOWED_DESKTOP_ACTIONS = {
    "OPEN_WORKSPACE_IN_VSCODE",
    "OPEN_WORKSPACE_FOLDER",
    "OPEN_URL_IN_BROWSER",
    "START_WORKSPACE_DEV_SERVER",
}


def _get_workspace_path(workspace_id: int) -> Path:
    workspace = get_trusted_workspace_record(workspace_id)

    if not workspace:
        raise ValueError("Workspace not found.")

    root = Path(workspace["path"]).expanduser().resolve()

    if not root.exists():
        raise ValueError(f"Workspace path does not exist: {root}")

    if not root.is_dir():
        raise ValueError(f"Workspace path is not a directory: {root}")

    return root


def _validate_public_or_local_url(url: str) -> str:
    parsed = urlparse(url.strip())

    if parsed.scheme not in ["http", "https"]:
        raise ValueError("Only http and https URLs are allowed.")

    if not parsed.netloc:
        raise ValueError("URL must include a valid host.")

    return url.strip()


def request_open_workspace_in_vscode(workspace_id: int) -> int:
    root = _get_workspace_path(workspace_id)

    return create_approval_request(
        action_type="OPEN_WORKSPACE_IN_VSCODE",
        title=f"Open VS Code: {root.name}",
        description="O.R.I.O.N. requests permission to open this workspace in VS Code.",
        payload={
            "workspace_id": workspace_id,
            "path": str(root),
        },
        risk_level="high",
        source="desktop_control",
    )


def request_open_workspace_folder(workspace_id: int) -> int:
    root = _get_workspace_path(workspace_id)

    return create_approval_request(
        action_type="OPEN_WORKSPACE_FOLDER",
        title=f"Open Folder: {root.name}",
        description="O.R.I.O.N. requests permission to open this workspace folder.",
        payload={
            "workspace_id": workspace_id,
            "path": str(root),
        },
        risk_level="low",
        source="desktop_control",
    )


def request_open_url_in_browser(url: str) -> int:
    safe_url = _validate_public_or_local_url(url)

    return create_approval_request(
        action_type="OPEN_URL_IN_BROWSER",
        title=f"Open Browser URL",
        description="O.R.I.O.N. requests permission to open this URL in your default browser.",
        payload={
            "url": safe_url,
        },
        risk_level="low",
        source="desktop_control",
    )


def request_start_workspace_dev_server(workspace_id: int) -> int:
    root = _get_workspace_path(workspace_id)
    command_plan = package_script_plan(workspace_id, "dev")

    package_json = root / "package.json"

    if not package_json.exists():
        raise ValueError("No package.json found. Dev server start is only enabled for Node/Next/Vite workspaces.")

    return create_approval_request(
        action_type="START_WORKSPACE_DEV_SERVER",
        title=f"Start Dev Server: {root.name}",
        description=command_plan["effect"],
        payload={
            "workspace_id": workspace_id,
            "path": str(root),
            "command": "npm run dev",
            "command_plan": command_plan,
        },
        risk_level="high",
        source="desktop_control",
    )


@requires_gateway
def _open_target(target: str) -> None:
    if sys.platform == "win32":
        os.startfile(target)
        return
    name = "open" if sys.platform == "darwin" else "xdg-open"
    opener = shutil.which(name)
    if not opener:
        raise RuntimeError(f"Desktop opener {name} was not found.")
    subprocess.Popen([opener, target], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def _approved_workspace(payload: Dict[str, Any]) -> Path:
    root = _get_workspace_path(int(payload.get("workspace_id", 0)))
    if str(root) != payload.get("path"):
        raise PermissionError("Workspace differs from the approved path. Request a new approval.")
    return root


@requires_gateway
def execute_approved_desktop_action(
    approval_id: int, approval: Optional[Dict[str, Any]] = None
) -> str:
    approval = approval or get_approval_request(approval_id)

    if not approval:
        raise ValueError("Approval request not found.")

    if approval["status"] != "executing":
        raise PermissionError(f"Approval request is not executing (status: {approval['status']}).")

    action_type = approval["action_type"]
    payload: Dict[str, Any] = approval.get("payload", {})

    if action_type not in ALLOWED_DESKTOP_ACTIONS:
        raise ValueError(f"No desktop executor available for action type: {action_type}")

    if action_type == "OPEN_WORKSPACE_IN_VSCODE":
        path = _approved_workspace(payload)

        code_command = shutil.which("code")

        if not code_command:
            raise RuntimeError("VS Code command `code` was not found. Install its command-line launcher first.")

        subprocess.Popen(
            [code_command, str(path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        return f"Opened workspace in VS Code: {path}"

    if action_type == "OPEN_WORKSPACE_FOLDER":
        path = _approved_workspace(payload)
        _open_target(str(path))

        return f"Opened workspace folder: {path}"

    if action_type == "OPEN_URL_IN_BROWSER":
        url = _validate_public_or_local_url(payload["url"])
        _open_target(url)

        return f"Opened URL in browser: {url}"

    if action_type == "START_WORKSPACE_DEV_SERVER":
        path = _approved_workspace(payload)
        revalidate_package_script(int(payload["workspace_id"]), "dev", payload.get("command_plan"))

        npm_command = shutil.which("npm")

        if not npm_command:
            raise RuntimeError("npm was not found on this system.")

        log_file = runtime_data_dir() / f"workspace-{int(payload['workspace_id'])}-dev-server.log"

        with log_file.open("a", encoding="utf-8") as log:
            subprocess.Popen(
                [npm_command, "run", "dev"],
                cwd=path,
                stdout=log,
                stderr=log,
            )

        return f"Started dev server for workspace: {path}\nLogs: {log_file}"

    return f"Unsupported desktop action type: {action_type}"
