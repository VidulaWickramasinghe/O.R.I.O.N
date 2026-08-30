import shlex
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional

from agents import function_tool

from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission
from core.approvals import create_approval_request, get_approval_request
from core.capability_gateway import requires_gateway
from core.workspace_manager import (
    get_trusted_workspace_record,
    is_sensitive_workspace_path,
    resolve_workspace_path,
)


DANGEROUS_KEYWORDS = [
    "rm",
    "sudo",
    "mkfs",
    "shutdown",
    "reboot",
    "passwd",
    "chown",
    "chmod",
    "dd",
    "curl",
    "wget",
    "scp",
    "ssh",
    ">",
    ">>",
    "|",
    "&&",
    ";",
]


ALLOWED_COMMANDS = [
    ["pwd"],
    ["ls"],
    ["git", "status"],
    ["git", "branch"],
    ["python", "--version"],
    ["python3", "--version"],
    ["node", "--version"],
    ["npm", "--version"],
    ["pip", "--version"],
    ["pip", "list"],
    ["npm", "run", "build"],
]


def _is_safe_command(command: str) -> bool:
    lowered = command.lower()

    for keyword in DANGEROUS_KEYWORDS:
        if keyword in lowered.split() or keyword in lowered:
            return False

    try:
        parts = shlex.split(command)
    except ValueError:
        return False

    for allowed in ALLOWED_COMMANDS:
        if parts[: len(allowed)] == allowed:
            return True

    return False


@requires_gateway
def _write_project_file_now(workspace_id: int, path: str, content: str) -> str:
    target = resolve_workspace_path(
        workspace_id,
        path,
        must_exist=False,
        allow_root=False,
    )
    if not target.parent.exists() or not target.parent.is_dir():
        raise FileNotFoundError("The destination parent directory does not exist.")
    target.write_text(content, encoding="utf-8")
    return f"Workspace file written: {path}"


@requires_gateway
def _run_safe_command_now(workspace_id: int, command: str) -> str:
    if not _is_safe_command(command):
        return f"Blocked unsafe or unapproved command: {command}"

    parts = shlex.split(command)
    workspace = get_trusted_workspace_record(workspace_id)
    workspace_root = Path(str(workspace["path"])).resolve(strict=True)

    result = subprocess.run(
        parts,
        cwd=workspace_root,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )

    output = result.stdout.strip()
    error = result.stderr.strip()

    if error:
        return f"Command completed with messages:\n{error}\n\nOutput:\n{output}"

    return output or "Command completed with no output."


@requires_gateway
def execute_approved_dev_action(
    approval_id: int, approval: Optional[Dict[str, Any]] = None
) -> str:
    """
    Execute a previously approved developer action.
    This is called by the approval API only after user approval.
    """
    approval = approval or get_approval_request(approval_id)

    if not approval:
        return "Approval request not found."

    if approval["status"] != "executing":
        return f"Approval request is not executing (status: {approval['status']})."

    action_type = approval["action_type"]
    payload = approval.get("payload", {})

    if action_type == "WRITE_PROJECT_FILE":
        return _write_project_file_now(
            workspace_id=int(payload.get("workspace_id", 0)),
            path=payload.get("path", "generated.txt"),
            content=payload.get("content", ""),
        )

    if action_type == "RUN_SAFE_COMMAND":
        return _run_safe_command_now(
            workspace_id=int(payload.get("workspace_id", 0)),
            command=payload.get("command", ""),
        )

    return f"No executor available for action type: {action_type}"


@function_tool
@instrument_tool("get_system_status")
@enforce_tool_permission("get_system_status")
def get_system_status() -> str:
    """
    Get basic local development system status.
    """
    return f"""
Current working directory: {Path.cwd()}
Python executable available: yes
O.R.I.O.N. trusted-workspace developer tools: online
Command Approval System: online
""".strip()


@function_tool
@instrument_tool("list_directory")
@enforce_tool_permission("list_directory")
def list_directory(workspace_id: int, path: str = ".") -> str:
    """
    Safely list files and folders inside a consented registered workspace.
    """
    try:
        target = resolve_workspace_path(
            workspace_id,
            path,
            must_exist=True,
            require_directory=True,
            allow_root=True,
        )
        workspace = get_trusted_workspace_record(workspace_id)
        root = Path(str(workspace["path"])).resolve(strict=True)

        items = sorted(target.iterdir())

        if not items:
            return "Directory is empty."

        lines = []
        for item in items:
            relative = item.relative_to(root)
            if is_sensitive_workspace_path(relative):
                continue
            try:
                resolved = item.resolve(strict=True)
                resolved.relative_to(root)
            except (FileNotFoundError, OSError, ValueError):
                continue
            item_type = "DIR " if resolved.is_dir() else "FILE"
            lines.append(f"{item_type} - {relative}")

        return "\n".join(lines)

    except Exception as error:
        return f"Directory listing failed: {error}"


@function_tool
@instrument_tool("read_project_file")
@enforce_tool_permission("read_project_file")
def read_project_file(workspace_id: int, path: str) -> str:
    """
    Safely read a text file inside a consented registered workspace.
    """
    try:
        target = resolve_workspace_path(
            workspace_id,
            path,
            must_exist=True,
            require_file=True,
        )

        if target.stat().st_size > 100_000:
            return "File is too large to read safely."

        return target.read_text(encoding="utf-8")

    except UnicodeDecodeError:
        return "File is not a readable UTF-8 text file."
    except Exception as error:
        return f"File read failed: {error}"


@function_tool
@instrument_tool("write_project_file")
@enforce_tool_permission("write_project_file")
def write_project_file(workspace_id: int, path: str, content: str) -> str:
    """
    Request approval before creating or updating a workspace-relative text file.
    """
    try:
        resolve_workspace_path(workspace_id, path, must_exist=False)
    except Exception as error:
        return f"File write request blocked: {error}"

    approval_id = create_approval_request(
        action_type="WRITE_PROJECT_FILE",
        title=f"Write file: {Path(path).name}",
        description="O.R.I.O.N. requests permission to write a generated project file.",
        payload={
            "workspace_id": workspace_id,
            "path": path,
            "content": content,
        },
        risk_level="medium",
        source="write_project_file",
    )

    return (
        f"Approval required before writing file. "
        f"Approval Request ID: {approval_id}. "
        f"Approve it in Aurora OS Command Approval panel."
    )


@function_tool
@instrument_tool("run_safe_command")
@enforce_tool_permission("run_safe_command")
def run_safe_command(workspace_id: int, command: str) -> str:
    """
    Request approval before running an approved non-destructive developer command.
    """
    if not _is_safe_command(command):
        return f"Blocked unsafe or unapproved command: {command}"
    try:
        get_trusted_workspace_record(workspace_id)
    except Exception as error:
        return f"Command request blocked: {error}"

    approval_id = create_approval_request(
        action_type="RUN_SAFE_COMMAND",
        title=f"Run command: {command}",
        description="O.R.I.O.N. requests permission to run an approved developer command.",
        payload={
            "workspace_id": workspace_id,
            "command": command,
        },
        risk_level="medium",
        source="run_safe_command",
    )

    return (
        f"Approval required before running command. "
        f"Approval Request ID: {approval_id}. "
        f"Approve it in Aurora OS Command Approval panel."
    )
