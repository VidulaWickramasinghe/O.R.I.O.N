"""Local-only release readiness and quality-gate reporting."""

from __future__ import annotations

import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from core.frontend_refactor import inspect_frontend_architecture
from core.release_candidate import generate_release_checklist, get_freeze_state
from core.stabilization_manager import run_stabilization_scan
from core.runtime_paths import runtime_data_dir
from core.release_evidence import get_release_evidence_status


PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = runtime_data_dir() / "quality_gate_reports"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _skipped(command: str) -> Dict[str, Any]:
    return {
        "ok": None,
        "returncode": None,
        "command": command,
        "stdout": "",
        "stderr": "Skipped. Set run_builds=true to run script checks.",
    }


def _run_script(script_name: str, timeout: int) -> Dict[str, Any]:
    script = PROJECT_ROOT / "scripts" / script_name
    if not script.is_file():
        return {
            "ok": False,
            "returncode": -1,
            "command": str(script),
            "stdout": "",
            "stderr": f"scripts/{script_name} not found.",
        }

    try:
        result = subprocess.run(
            ["bash", str(script)],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env={**os.environ, "PYTHONUNBUFFERED": "1"},
        )
        return {
            "ok": result.returncode == 0,
            "returncode": result.returncode,
            "command": f"./scripts/{script_name}",
            "stdout": result.stdout[-8000:],
            "stderr": result.stderr[-8000:],
        }
    except (OSError, subprocess.TimeoutExpired) as error:
        return {
            "ok": False,
            "returncode": -1,
            "command": f"./scripts/{script_name}",
            "stdout": "",
            "stderr": str(error),
        }


def generate_release_verification_snapshot() -> Dict[str, Any]:
    frontend = inspect_frontend_architecture()
    stabilization = run_stabilization_scan(False)
    checklist = generate_release_checklist()
    ci_evidence = get_release_evidence_status()
    checks = [
        {
            "name": "Required CI evidence is valid",
            "ok": ci_evidence["ok"],
            "details": ci_evidence.get("run_url") or ci_evidence.get("error", "Evidence unavailable"),
        },
        {
            "name": "Frontend architecture available",
            "ok": frontend.get("status") != "needs_refactor",
            "details": f"Status: {frontend.get('status')}",
        },
        {
            "name": "Frontend resilience wired",
            "ok": frontend.get("resilience_ready") is True,
            "details": f"Isolated panels: {frontend.get('panel_boundary_count', 0)}",
        },
        {
            "name": "Global dashboard store healthy",
            "ok": frontend.get("store_healthy") is True,
            "details": f"Missing actions: {len(frontend.get('missing_store_actions', []))}",
        },
        {
            "name": "Stabilization not critical",
            "ok": stabilization.get("status") != "needs_attention",
            "details": f"Status: {stabilization.get('status')}",
        },
        {
            "name": "Release checklist",
            "ok": checklist.get("failed", 0) == 0,
            "details": f"Failed: {checklist.get('failed', 0)}",
        },
    ]
    failed = sum(not check["ok"] for check in checks)
    return {
        "status": "passed" if failed == 0 else "needs_attention",
        "generated_at": _now(),
        "passed": len(checks) - failed,
        "failed": failed,
        "checks": checks,
        "freeze_state": get_freeze_state(),
        "frontend_refactor": frontend,
        "stabilization": stabilization,
        "release_checklist": checklist,
    }


def render_release_verification_report(
    snapshot: Dict[str, Any] | None = None,
) -> str:
    snapshot = snapshot or generate_release_verification_snapshot()
    lines = "\n".join(
        f"- [{'x' if check['ok'] else ' '}] {check['name']} — {check['details']}"
        for check in snapshot["checks"]
    )
    return f"""# O.R.I.O.N. v6.5 Release Verification Report

Generated: {snapshot['generated_at']}
Status: {snapshot['status']}
Passed: {snapshot['passed']}
Failed: {snapshot['failed']}

## Checks

{lines}

## Safety

Verification does not publish, push, delete, or bypass approvals.
"""


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as handle:
        handle.write(content)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)


def save_release_verification_report() -> Dict[str, Any]:
    snapshot = generate_release_verification_snapshot()
    report = render_release_verification_report(snapshot)
    path = REPORT_DIR / (
        f"orion_v6_2_release_verification_{datetime.now():%Y%m%d_%H%M%S_%f}.md"
    )
    _atomic_write(path, report)
    return {
        "status": "saved",
        "path": str(path),
        "report": report,
        "snapshot": snapshot,
        "generated_at": _now(),
    }


def run_quality_gate_snapshot(
    run_builds: bool = False,
    verification: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    required_gate = _skipped("./scripts/quality_gate.sh")
    if run_builds:
        required_gate = _run_script("quality_gate.sh", timeout=1800)

    verification = verification or generate_release_verification_snapshot()
    if not run_builds:
        status = "not_run"
    elif required_gate["ok"] is True and verification["status"] == "passed":
        status = "passed"
    else:
        status = "failed"
    return {
        "status": status,
        "generated_at": _now(),
        "required_gate": required_gate,
        "backend_check": required_gate,
        "frontend_check": required_gate,
        "verification": verification,
    }
