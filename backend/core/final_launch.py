"""Local-only final launch marker, checklist, and package generation."""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from core.demo_recording import inspect_demo_recording_readiness
from core.demo_walkthrough import inspect_demo_walkthrough
from core.frontend_refactor import inspect_frontend_architecture
from core.github_polish import generate_github_polish_checklist
from core.portfolio_showcase import inspect_portfolio_showcase
from core.public_release import generate_public_release_package
from core.release_candidate import generate_release_checklist, get_freeze_state
from core.release_verification import generate_release_verification_snapshot
from core.stabilization_manager import run_stabilization_scan


FINAL_LAUNCH_DIR = Path(__file__).resolve().parents[1] / "data" / "final_launch"
FREEZE_STATE_FILE = FINAL_LAUNCH_DIR / "final_launch_freeze_state.json"
RELEASE_VERSION = "v6.5"
RELEASE_NAME = "Final Public Launch Checklist + Repository Freeze"
DEFAULT_FREEZE_STATE = {
    "frozen": False,
    "release_version": RELEASE_VERSION,
    "release_name": RELEASE_NAME,
    "freeze_reason": "",
    "frozen_at": "",
    "unfrozen_at": "",
    "updated_at": "",
}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as handle:
        handle.write(content)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)


def _valid_timestamp(value: Any) -> str:
    if not isinstance(value, str) or not value:
        return ""
    try:
        datetime.fromisoformat(value)
    except ValueError:
        return ""
    return value


def _normalize_freeze_state(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        return DEFAULT_FREEZE_STATE.copy()
    return {
        "frozen": value.get("frozen") is True,
        "release_version": RELEASE_VERSION,
        "release_name": RELEASE_NAME,
        "freeze_reason": str(value.get("freeze_reason", ""))[:500],
        "frozen_at": _valid_timestamp(value.get("frozen_at")),
        "unfrozen_at": _valid_timestamp(value.get("unfrozen_at")),
        "updated_at": _valid_timestamp(value.get("updated_at")),
    }


def load_final_launch_freeze_state() -> Dict[str, Any]:
    """Read the local marker without creating state as a GET side effect."""
    try:
        return _normalize_freeze_state(
            json.loads(FREEZE_STATE_FILE.read_text(encoding="utf-8"))
        )
    except (OSError, json.JSONDecodeError):
        return DEFAULT_FREEZE_STATE.copy()


def save_final_launch_freeze_state(state: Dict[str, Any]) -> Dict[str, Any]:
    normalized = _normalize_freeze_state(state)
    normalized["updated_at"] = _now()
    _atomic_write(FREEZE_STATE_FILE, json.dumps(normalized, indent=2, sort_keys=True))
    return normalized


def _validate_reason(reason: str) -> str:
    value = reason.strip()
    if not value:
        raise ValueError("Freeze reason is required.")
    if len(value) > 500:
        raise ValueError("Freeze reason must be 500 characters or fewer.")
    return value


def freeze_final_launch(
    reason: str = "Final public portfolio launch preparation.",
) -> Dict[str, Any]:
    state = load_final_launch_freeze_state()
    state.update({
        "frozen": True,
        "freeze_reason": _validate_reason(reason),
        "frozen_at": _now(),
        "unfrozen_at": "",
    })
    return save_final_launch_freeze_state(state)


def unfreeze_final_launch(reason: str = "Final launch freeze lifted.") -> Dict[str, Any]:
    state = load_final_launch_freeze_state()
    state.update({
        "frozen": False,
        "freeze_reason": _validate_reason(reason),
        "unfrozen_at": _now(),
    })
    return save_final_launch_freeze_state(state)


def generate_final_launch_checklist() -> Dict[str, Any]:
    stabilization = run_stabilization_scan(run_build=False)
    frontend = inspect_frontend_architecture()
    github = generate_github_polish_checklist()
    portfolio = inspect_portfolio_showcase()
    walkthrough = inspect_demo_walkthrough()
    recording = inspect_demo_recording_readiness()
    verification = generate_release_verification_snapshot()
    release = generate_release_checklist()
    final = load_final_launch_freeze_state()
    release_freeze = get_freeze_state()
    checks = [
        ("Repository final launch marker active", final["frozen"], f"Frozen: {final['frozen']}"),
        ("Stabilization scan not critical", stabilization.get("status") != "needs_attention", f"Status: {stabilization.get('status')}"),
        ("Frontend architecture ready", frontend.get("status") in {"healthy", "improving", "page_too_large"}, f"Status: {frontend.get('status')}"),
        ("Frontend resilience ready", frontend.get("resilience_ready") is True, f"Ready: {frontend.get('resilience_ready')}"),
        ("GitHub polish clean", github.get("failed", 1) == 0, f"Failed: {github.get('failed')}"),
        ("Portfolio screenshots ready", portfolio.get("status") == "ready", f"Status: {portfolio.get('status')}"),
        ("Guided walkthrough ready", walkthrough.get("status") == "ready", f"Steps: {walkthrough.get('step_count')}"),
        ("Demo recording mode ready", recording.get("status") == "ready", f"Scenes: {recording.get('scene_count')}"),
        ("Release verification passed", verification.get("status") == "passed", f"Failed: {verification.get('failed')}"),
        ("Release candidate checklist clean", release.get("failed", 1) == 0, f"Failed: {release.get('failed')}"),
        ("Release candidate freeze active", release_freeze.get("frozen") is True, f"Frozen: {release_freeze.get('frozen')}"),
    ]
    checks = [
        {"name": name, "ok": bool(ok), "details": details}
        for name, ok, details in checks
    ]
    passed = sum(check["ok"] for check in checks)
    return {
        "status": "launch_ready" if passed == len(checks) else "review_needed",
        "generated_at": _now(),
        "passed": passed,
        "failed": len(checks) - passed,
        "checks": checks,
        "final_freeze": final,
        "release_freeze": release_freeze,
    }


def render_final_launch_report(checklist: Dict[str, Any] | None = None) -> str:
    checklist = checklist or generate_final_launch_checklist()
    lines = "\n".join(
        f"- [{'x' if check['ok'] else ' '}] {check['name']} — {check['details']}"
        for check in checklist["checks"]
    )
    return f"""# O.R.I.O.N. v6.5 Final Public Launch Report

Generated: {checklist['generated_at']}
Status: {checklist['status']}
Passed: {checklist['passed']}
Failed: {checklist['failed']}

## Final Launch Checklist

{lines}

## Safety

The freeze is a local readiness marker only. This report does not push, publish,
delete, expose secrets, make the Git repository immutable, or bypass approvals.
"""


def save_final_launch_report() -> Dict[str, Any]:
    checklist = generate_final_launch_checklist()
    report = render_final_launch_report(checklist)
    path = FINAL_LAUNCH_DIR / f"FINAL_LAUNCH_REPORT_{_timestamp()}.md"
    _atomic_write(path, report)
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report, "checklist": checklist}


def generate_final_launch_package() -> Dict[str, Any]:
    checklist = generate_final_launch_checklist()
    if not checklist["final_freeze"]["frozen"]:
        raise ValueError("Final launch marker must be frozen before packaging.")
    report = render_final_launch_report(checklist)
    stamp = _timestamp()
    report_path = FINAL_LAUNCH_DIR / f"FINAL_PUBLIC_LAUNCH_{stamp}.md"
    summary_path = FINAL_LAUNCH_DIR / f"FINAL_PUBLIC_LAUNCH_SUMMARY_{stamp}.json"
    public = generate_public_release_package()
    result = {
        "status": checklist["status"],
        "generated_at": _now(),
        "release_version": RELEASE_VERSION,
        "release_name": RELEASE_NAME,
        "passed": checklist["passed"],
        "failed": checklist["failed"],
        "report_path": str(report_path),
        "summary_path": str(summary_path),
        "public_release": public,
        "safety": {"pushes_to_github": False, "publishes_release": False, "deletes_files": False, "bypasses_approvals": False},
    }
    _atomic_write(report_path, report)
    _atomic_write(summary_path, json.dumps(result, indent=2, sort_keys=True))
    return result
