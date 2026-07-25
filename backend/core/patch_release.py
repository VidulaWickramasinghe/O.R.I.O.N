"""Local-only patch planning and release artifact generation for O.R.I.O.N."""

import json
import os
import re
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from core.post_release_maintenance import generate_patch_plan
from core.release_verification import generate_release_verification_snapshot
from core.stable_release import generate_stable_release_checklist, load_version_lock


PATCH_RELEASE_DIR = Path(__file__).resolve().parents[1] / "data" / "patch_release"
PATCH_STATE_FILE = PATCH_RELEASE_DIR / "patch_release_state.json"

DEFAULT_PATCH_STATE: Dict[str, Any] = {
    "active": False,
    "base_version": "v6.2",
    "patch_version": "v6.2.1",
    "patch_type": "maintenance",
    "started_at": "",
    "completed_at": "",
    "reason": "",
    "updated_at": "",
}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(content)
        temporary = Path(handle.name)
    os.replace(temporary, path)


def _clean_reason(reason: str) -> str:
    value = reason.strip()
    if not value:
        raise ValueError("Patch reason is required.")
    if len(value) > 500:
        raise ValueError("Patch reason must be 500 characters or fewer.")
    return value


def _validate_version(version: str) -> str:
    value = version.strip()
    if not re.fullmatch(r"v6\.2\.[1-9][0-9]*", value):
        raise ValueError("Patch version must match v6.2.N where N is at least 1.")
    return value


def _normalize_state(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        return DEFAULT_PATCH_STATE.copy()
    patch_type = value.get("patch_type") if value.get("patch_type") in {"maintenance", "bugfix", "hotfix"} else "maintenance"
    version = value.get("patch_version", DEFAULT_PATCH_STATE["patch_version"])
    try:
        version = _validate_version(str(version))
    except ValueError:
        version = DEFAULT_PATCH_STATE["patch_version"]
    return {**DEFAULT_PATCH_STATE, "active": value.get("active") is True, "patch_version": version, "patch_type": patch_type, "started_at": str(value.get("started_at", ""))[:32], "completed_at": str(value.get("completed_at", ""))[:32], "reason": str(value.get("reason", ""))[:500], "updated_at": str(value.get("updated_at", ""))[:32]}


def load_patch_state() -> Dict[str, Any]:
    """Read state without creating files as a GET side effect."""
    try:
        return _normalize_state(json.loads(PATCH_STATE_FILE.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, OSError):
        return DEFAULT_PATCH_STATE.copy()


def save_patch_state(state: Dict[str, Any]) -> Dict[str, Any]:
    saved = _normalize_state(state)
    saved["updated_at"] = _now()
    _atomic_write(PATCH_STATE_FILE, json.dumps(saved, indent=2, sort_keys=True))
    return saved


def start_patch_release(patch_version: str = "v6.2.1", patch_type: str = "maintenance", reason: str = "Post-release maintenance patch.") -> Dict[str, Any]:
    if patch_type not in {"maintenance", "bugfix", "hotfix"}:
        raise ValueError("Patch type must be maintenance, bugfix, or hotfix.")
    return save_patch_state({**load_patch_state(), "active": True, "patch_version": _validate_version(patch_version), "patch_type": patch_type, "started_at": _now(), "completed_at": "", "reason": _clean_reason(reason)})


def complete_patch_release(reason: str = "Patch release workflow completed locally.") -> Dict[str, Any]:
    state = load_patch_state()
    if not state["active"]:
        raise ValueError("No active patch release workflow to complete.")
    return save_patch_state({**state, "active": False, "completed_at": _now(), "reason": _clean_reason(reason)})

def classify_patch_type() -> Dict[str, Any]:
    """Derive a local patch candidate from the known-issue priority counts."""
    plan = generate_patch_plan()
    if plan["critical_count"]:
        patch_type, urgency = "hotfix", "critical"
    elif plan["high_count"]:
        patch_type, urgency = "bugfix", "high"
    elif plan["open_count"]:
        patch_type, urgency = "maintenance", "normal"
    else:
        patch_type, urgency = "none", "none"
    return {
        "patch_type": patch_type,
        "patch_version": "v6.2.1" if plan["open_count"] else "no_patch_needed",
        "urgency": urgency,
        **{key: plan[key] for key in ("open_count", "critical_count", "high_count", "medium_count", "low_count")},
    }


def generate_hotfix_checklist() -> Dict[str, Any]:
    state, plan = load_patch_state(), generate_patch_plan()
    verification = generate_release_verification_snapshot()
    stable_release, version_lock = generate_stable_release_checklist(), load_version_lock()
    checks = [
        {"name": "Patch workflow active", "ok": bool(state["active"]), "details": f"Active: {state['active']}"},
        {"name": "Stable version lock active", "ok": version_lock.get("locked") is True, "details": f"Locked: {version_lock.get('locked')}"},
        {"name": "Stable release baseline acceptable", "ok": stable_release["status"] == "stable_release_ready", "details": f"Status: {stable_release['status']}"},
        {"name": "Patch plan available", "ok": plan["status"] in {"patch_needed", "clean"}, "details": f"Status: {plan['status']} | Open: {plan['open_count']}"},
        {"name": "Release verification available", "ok": verification["status"] == "passed", "details": f"Status: {verification['status']}"},
        {"name": "Critical hotfixes require manual review", "ok": True, "details": f"Critical issues: {plan['critical_count']}"},
    ]
    passed = sum(check["ok"] for check in checks)
    status = "hotfix_review_required" if plan["critical_count"] else "patch_ready" if plan["open_count"] else "no_patch_needed"
    return {
        "status": status, "generated_at": _now(), "patch_state": state, "patch_plan": plan,
        "passed": passed, "failed": len(checks) - passed, "checks": checks,
        "verification": verification, "stable_release": stable_release,
        "safety": {"pushes_to_github": False, "publishes_release": False, "modifies_github_issues": False, "deletes_files": False, "bypasses_approvals": False},
    }


def generate_patch_notes() -> str:
    state, plan = load_patch_state(), generate_patch_plan()
    issues = "\n".join(f"- [{item['priority']}] {item['title']} — {item['category']}" for item in plan["open_issues"]) or "- No known open issues selected."
    return f"""# O.R.I.O.N. {state['patch_version']} Patch Notes

## Patch Type

{state['patch_type']}

## Reason

{state['reason']}

## Issues Considered

{issues}

## Safety

This local workflow does not push, publish, modify GitHub issues, delete files, or bypass approvals.
"""


def render_patch_release_report() -> str:
    checklist = generate_hotfix_checklist()
    checks = "\n".join(f"- [{'x' if check['ok'] else ' '}] {check['name']} — {check['details']}" for check in checklist["checks"])
    state, plan = checklist["patch_state"], checklist["patch_plan"]
    return f"""# O.R.I.O.N. v6.2 Patch Release Manager Report

Generated: {checklist['generated_at']}
Status: {checklist['status']}

## Patch State

- Active: {state['active']}
- Base Version: {state['base_version']}
- Patch Version: {state['patch_version']}
- Patch Type: {state['patch_type']}
- Reason: {state['reason']}

## Hotfix Checklist

{checks}

## Patch Plan

- Recommended Patch: {plan['recommended_patch']}
- Open Issues: {plan['open_count']}
- Critical: {plan['critical_count']}
- High: {plan['high_count']}

## Safety

No GitHub push, release publishing, GitHub issue modification, deletion, or approval bypass occurs.
"""


def save_patch_release_report() -> Dict[str, Any]:
    report = render_patch_release_report()
    path = PATCH_RELEASE_DIR / f"PATCH_RELEASE_REPORT_{_timestamp()}.md"
    _atomic_write(path, report)
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report}


def generate_patch_release_package() -> Dict[str, Any]:
    """Generate local report, notes, checklist, and JSON summary only."""
    checklist, timestamp = generate_hotfix_checklist(), _timestamp()
    if not checklist["patch_state"]["active"]:
        raise ValueError("Patch workflow must be active before packaging.")
    paths = {name: PATCH_RELEASE_DIR / f"{name.upper()}_{timestamp}.md" for name in ("patch_release_report", "patch_notes", "hotfix_checklist")}
    report = render_patch_release_report()
    _atomic_write(paths["patch_release_report"], report)
    _atomic_write(paths["patch_notes"], generate_patch_notes())
    _atomic_write(paths["hotfix_checklist"], report)
    summary_path = PATCH_RELEASE_DIR / f"PATCH_RELEASE_SUMMARY_{timestamp}.json"
    summary = {
        "status": checklist["status"], "generated_at": _now(), "patch_version": checklist["patch_state"]["patch_version"],
        "patch_type": checklist["patch_state"]["patch_type"], "passed": checklist["passed"], "failed": checklist["failed"],
        "report_path": str(paths["patch_release_report"]), "notes_path": str(paths["patch_notes"]),
        "checklist_path": str(paths["hotfix_checklist"]), "summary_path": str(summary_path), "safety": checklist["safety"],
    }
    _atomic_write(summary_path, json.dumps(summary, indent=2, sort_keys=True))
    return summary
