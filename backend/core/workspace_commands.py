"""Approval evidence for workspace-defined commands."""

import hashlib
import json
from pathlib import Path
from typing import Any

from core.workspace_manager import get_trusted_workspace_record, resolve_workspace_path


def package_script_plan(workspace_id: int, script: str) -> dict[str, Any]:
    if script not in {"build", "dev"}:
        raise ValueError("Only build and dev package scripts can be requested.")
    workspace = get_trusted_workspace_record(workspace_id)
    manifest = resolve_workspace_path(workspace_id, "package.json", require_file=True)
    if manifest.stat().st_size > 1_048_576:
        raise ValueError("package.json exceeds the 1 MiB review limit.")
    content = manifest.read_bytes()
    scripts = json.loads(content).get("scripts", {})
    if not isinstance(scripts, dict) or not isinstance(scripts.get(script), str) or not scripts[script].strip():
        raise ValueError(f"No npm {script} script is defined.")
    lifecycle = {key: scripts[key] for key in (f"pre{script}", script, f"post{script}") if key in scripts}
    if any(not isinstance(value, str) for value in lifecycle.values()):
        raise ValueError("Package scripts must be strings.")
    return {
        "workspace_path": str(Path(workspace["path"]).resolve(strict=True)),
        "command": f"npm run {script}",
        "scripts": lifecycle,
        "package_sha256": hashlib.sha256(content).hexdigest(),
        "risk": "high",
        "effect": "Executes workspace code, including lifecycle scripts, with your OS permissions; may write files or access the network.",
    }


def revalidate_package_script(workspace_id: int, script: str, approved: dict[str, Any] | None) -> dict[str, Any]:
    current = package_script_plan(workspace_id, script)
    if not approved or current != approved:
        raise PermissionError("Package command evidence changed or is missing. Request a new approval.")
    return current
