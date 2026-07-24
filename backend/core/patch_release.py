"""Local-only patch planning and release artifact generation for O.R.I.O.N."""

import json
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
    "base_version": "v6.0",
    "patch_version": "v6.0.1",
    "patch_type": "maintenance",
    "started_at": "",
    "completed_at": "",
    "reason": "",
    "updated_at": "",
}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def load_patch_state() -> Dict[str, Any]:
    """Load the local patch workflow state, initializing it when needed."""
    if not PATCH_STATE_FILE.exists():
        return save_patch_state(DEFAULT_PATCH_STATE.copy())
    try:
        return {**DEFAULT_PATCH_STATE, **json.loads(PATCH_STATE_FILE.read_text(encoding="utf-8"))}
    except (json.JSONDecodeError, OSError):
        return DEFAULT_PATCH_STATE.copy()


def save_patch_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Persist state locally; this function never performs a remote operation."""
    PATCH_RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    saved = {**DEFAULT_PATCH_STATE, **state, "updated_at": _now()}
    PATCH_STATE_FILE.write_text(json.dumps(saved, indent=2), encoding="utf-8")
    return saved


def start_patch_release(
    patch_version: str = "v6.0.1",
    patch_type: str = "maintenance",
    reason: str = "Post-release maintenance patch.",
) -> Dict[str, Any]:
    return save_patch_state({
        **load_patch_state(), "active": True, "patch_version": patch_version,
        "patch_type": patch_type, "started_at": _now(), "completed_at": "", "reason": reason,
    })


def complete_patch_release(reason: str = "Patch release workflow completed locally.") -> Dict[str, Any]:
    return save_patch_state({**load_patch_state(), "active": False, "completed_at": _now(), "reason": reason})


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
        "patch_version": "v6.0.1" if plan["open_count"] else "no_patch_needed",
        "urgency": urgency,
        **{key: plan[key] for key in ("open_count", "critical_count", "high_count", "medium_count", "low_count")},
    }


def generate_hotfix_checklist() -> Dict[str, Any]:
    state, plan = load_patch_state(), generate_patch_plan()
    verification = generate_release_verification_snapshot()
    stable_release, version_lock = generate_stable_release_checklist(), load_version_lock()
    checks = [
        {"name": "Patch workflow active", "ok": bool(state["active"]), "details": f"Active: {state['active']}"},
        {"name": "Stable version lock exists", "ok": "locked" in version_lock, "details": f"Locked: {version_lock.get('locked')}"},
        {"name": "Stable release baseline acceptable", "ok": stable_release["status"] in {"stable_release_ready", "release_review_needed"}, "details": f"Status: {stable_release['status']}"},
        {"name": "Patch plan available", "ok": plan["status"] in {"patch_needed", "clean"}, "details": f"Status: {plan['status']} | Open: {plan['open_count']}"},
        {"name": "Release verification available", "ok": verification["status"] in {"passed", "needs_attention"}, "details": f"Status: {verification['status']}"},
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
    path.write_text(report, encoding="utf-8")
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report}


def generate_patch_release_package() -> Dict[str, Any]:
    """Generate local report, notes, checklist, and JSON summary only."""
    PATCH_RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    checklist, timestamp = generate_hotfix_checklist(), _timestamp()
    paths = {name: PATCH_RELEASE_DIR / f"{name.upper()}_{timestamp}.md" for name in ("patch_release_report", "patch_notes", "hotfix_checklist")}
    paths["patch_release_report"].write_text(render_patch_release_report(), encoding="utf-8")
    paths["patch_notes"].write_text(generate_patch_notes(), encoding="utf-8")
    paths["hotfix_checklist"].write_text(render_patch_release_report(), encoding="utf-8")
    summary_path = PATCH_RELEASE_DIR / f"PATCH_RELEASE_SUMMARY_{timestamp}.json"
    summary = {
        "status": checklist["status"], "generated_at": _now(), "patch_version": checklist["patch_state"]["patch_version"],
        "patch_type": checklist["patch_state"]["patch_type"], "passed": checklist["passed"], "failed": checklist["failed"],
        "report_path": str(paths["patch_release_report"]), "notes_path": str(paths["patch_notes"]),
        "checklist_path": str(paths["hotfix_checklist"]), "summary_path": str(summary_path), "safety": checklist["safety"],
    }
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary
