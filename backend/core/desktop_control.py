import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict
from urllib.parse import urlparse

from core.approvals import create_approval_request, get_approval_request
from core.workspace_manager import get_workspace_record


ALLOWED_DESKTOP_ACTIONS = {
    "OPEN_WORKSPACE_IN_VSCODE",
    "OPEN_WORKSPACE_FOLDER",
    "OPEN_URL_IN_BROWSER",
    "START_WORKSPACE_DEV_SERVER",
}


def _get_workspace_path(workspace_id: int) -> Path:
    workspace = get_workspace_record(workspace_id)

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
        risk_level="low",
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

    package_json = root / "package.json"

    if not package_json.exists():
        raise ValueError("No package.json found. Dev server start is only enabled for Node/Next/Vite workspaces.")

    return create_approval_request(
        action_type="START_WORKSPACE_DEV_SERVER",
        title=f"Start Dev Server: {root.name}",
        description="O.R.I.O.N. requests permission to start the workspace development server using npm run dev.",
        payload={
            "workspace_id": workspace_id,
            "path": str(root),
            "command": "npm run dev",
        },
        risk_level="medium",
        source="desktop_control",
    )


def execute_approved_desktop_action(approval_id: int) -> str:
    approval = get_approval_request(approval_id)

    if not approval:
        return "Approval request not found."

    if approval["status"] != "pending":
        return f"Approval request is already {approval['status']}."

    action_type = approval["action_type"]
    payload: Dict[str, Any] = approval.get("payload", {})

    if action_type not in ALLOWED_DESKTOP_ACTIONS:
        return f"No desktop executor available for action type: {action_type}"

    if action_type == "OPEN_WORKSPACE_IN_VSCODE":
        path = Path(payload["path"]).expanduser().resolve()

        if not path.exists() or not path.is_dir():
            return f"Workspace path is invalid: {path}"

        code_command = shutil.which("code")

        if not code_command:
            return "VS Code command `code` was not found. Install VS Code command-line launcher first."

        subprocess.Popen(
            [code_command, str(path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        return f"Opened workspace in VS Code: {path}"

    if action_type == "OPEN_WORKSPACE_FOLDER":
        path = Path(payload["path"]).expanduser().resolve()

        if not path.exists() or not path.is_dir():
            return f"Workspace path is invalid: {path}"

        opener = shutil.which("xdg-open")

        if not opener:
            return "`xdg-open` was not found on this system."

        subprocess.Popen(
            [opener, str(path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        return f"Opened workspace folder: {path}"

    if action_type == "OPEN_URL_IN_BROWSER":
        url = _validate_public_or_local_url(payload["url"])
        opener = shutil.which("xdg-open")

        if not opener:
            return "`xdg-open` was not found on this system."

        subprocess.Popen(
            [opener, url],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        return f"Opened URL in browser: {url}"

    if action_type == "START_WORKSPACE_DEV_SERVER":
        path = Path(payload["path"]).expanduser().resolve()

        if not path.exists() or not path.is_dir():
            return f"Workspace path is invalid: {path}"

        package_json = path / "package.json"

        if not package_json.exists():
            return "No package.json found. Cannot start npm dev server."

        npm_command = shutil.which("npm")

        if not npm_command:
            return "`npm` was not found on this system."

        log_file = path / "orion-dev-server.log"

        with log_file.open("a", encoding="utf-8") as log:
            subprocess.Popen(
                [npm_command, "run", "dev"],
                cwd=path,
                stdout=log,
                stderr=log,
            )

        return f"Started dev server for workspace: {path}\nLogs: {log_file}"

    return f"Unsupported desktop action type: {action_type}"
