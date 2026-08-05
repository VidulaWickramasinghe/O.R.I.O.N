"""Side-effect-free aggregate production readiness snapshots."""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict

from core.demo_recording import inspect_demo_recording_readiness
from core.demo_walkthrough import inspect_demo_walkthrough
from core.final_launch import generate_final_launch_checklist, load_final_launch_freeze_state
from core.frontend_refactor import inspect_frontend_architecture
from core.github_launch import generate_github_launch_checklist
from core.github_polish import generate_github_polish_checklist
from core.portfolio_showcase import inspect_portfolio_showcase
from core.public_landing import inspect_public_landing
from core.public_release import get_latest_public_release_package
from core.release_candidate import generate_release_checklist, get_freeze_state
from core.release_verification import generate_release_verification_snapshot
from core.stabilization_manager import run_stabilization_scan
from core.ui_polish import inspect_ui_polish

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PRODUCTION_DIR = PROJECT_ROOT / "backend" / "data" / "production_readiness"
RELEASE_VERSION = "v6.5"
RELEASE_NAME = "Production Readiness Snapshot + Final Release Candidate v2"


def _now() -> str: return datetime.now().isoformat(timespec="seconds")
def _stamp() -> str: return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(content); temporary = Path(handle.name)
    os.replace(temporary, path)


def _safe(name: str, call: Callable[[], Dict[str, Any]]) -> Dict[str, Any]:
    try:
        value = call()
        return value if isinstance(value, dict) else {"status": "failed", "error": f"{name} returned invalid data"}
    except Exception as error:
        return {"status": "failed", "error": f"{type(error).__name__}: {error}"[:500]}


def generate_production_readiness_snapshot() -> Dict[str, Any]:
    data = {
        "stabilization": _safe("stabilization", lambda: run_stabilization_scan(run_build=False)),
        "frontend": _safe("frontend", inspect_frontend_architecture),
        "verification": _safe("verification", generate_release_verification_snapshot),
        "release_checklist": _safe("release checklist", lambda: generate_release_checklist(include_dashboard=False)),
        "release_freeze": _safe("release freeze", get_freeze_state),
        "final_launch": _safe("final launch", generate_final_launch_checklist),
        "final_freeze": _safe("final freeze", load_final_launch_freeze_state),
        "github_launch": _safe("GitHub launch", generate_github_launch_checklist),
        "github_polish": _safe("GitHub polish", generate_github_polish_checklist),
        "public_landing": _safe("public landing", inspect_public_landing),
        "ui_polish": _safe("UI polish", inspect_ui_polish),
        "recording": _safe("recording", inspect_demo_recording_readiness),
        "walkthrough": _safe("walkthrough", inspect_demo_walkthrough),
        "portfolio": _safe("portfolio", inspect_portfolio_showcase),
        "public_release": _safe("public release", get_latest_public_release_package),
    }
    specifications = [
        ("Backend stabilization acceptable", data["stabilization"].get("status") != "needs_attention" and "error" not in data["stabilization"]),
        ("Frontend architecture ready", data["frontend"].get("resilience_ready") is True and data["frontend"].get("store_healthy") is True),
        ("Release verification passed", data["verification"].get("status") == "passed"),
        ("Release checklist clean", data["release_checklist"].get("failed") == 0),
        ("Release candidate freeze active", data["release_freeze"].get("frozen") is True),
        ("Final launch freeze active", data["final_freeze"].get("frozen") is True),
        ("Final launch clean", data["final_launch"].get("failed") == 0),
        ("GitHub launch clean", data["github_launch"].get("failed") == 0),
        ("GitHub polish clean", data["github_polish"].get("failed") == 0),
        ("Public landing ready", data["public_landing"].get("status") == "ready"),
        ("Responsive UI ready", data["ui_polish"].get("mobile_ready") is True),
        ("Demo recording ready", data["recording"].get("status") == "ready"),
        ("Guided walkthrough ready", data["walkthrough"].get("status") == "ready"),
        ("Portfolio screenshots ready", data["portfolio"].get("status") == "ready"),
        ("Public release package available", data["public_release"].get("status") in {"generated", "ready"}),
    ]
    checks = [{"name": name, "ok": bool(ok), "details": "Pass" if ok else "Review required"} for name, ok in specifications]
    passed = sum(check["ok"] for check in checks); failed = len(checks) - passed
    score = round(passed / len(checks) * 100)
    status = "production_ready" if failed == 0 else "release_candidate" if failed <= 2 else "review_needed"
    return {
        "status": status, "generated_at": _now(), "release_version": RELEASE_VERSION,
        "release_name": RELEASE_NAME, "readiness_score": score, "passed": passed,
        "failed": failed, "checks": checks,
        "stabilization": {"status": data["stabilization"].get("status")},
        "frontend": {"status": data["frontend"].get("status"), "resilience_ready": data["frontend"].get("resilience_ready"), "store_healthy": data["frontend"].get("store_healthy")},
        "release": {"verification_status": data["verification"].get("status"), "candidate_frozen": data["release_freeze"].get("frozen")},
        "launch": {"final_launch_status": data["final_launch"].get("status"), "github_launch_status": data["github_launch"].get("status")},
        "presentation": {"public_landing_status": data["public_landing"].get("status"), "ui_polish_status": data["ui_polish"].get("status"), "portfolio_showcase_status": data["portfolio"].get("status")},
        "public_release": {"status": data["public_release"].get("status"), "artifact_count": data["public_release"].get("artifact_count", 0), "summary_path": data["public_release"].get("summary_path", "")},
        "safety": {"pushes_to_github": False, "publishes_release": False, "deletes_files": False, "exposes_secrets": False, "bypasses_approvals": False},
    }


def render_production_readiness_report(snapshot: Dict[str, Any] | None = None) -> str:
    snapshot = snapshot or generate_production_readiness_snapshot()
    lines = "\n".join(f"- [{'x' if item['ok'] else ' '}] {item['name']} — {item['details']}" for item in snapshot["checks"])
    return f"""# O.R.I.O.N. {RELEASE_VERSION} Production Readiness Snapshot

Generated: {snapshot['generated_at']}
Status: {snapshot['status']}
Readiness Score: {snapshot['readiness_score']}%
Passed: {snapshot['passed']}
Failed: {snapshot['failed']}

## Checks

{lines}

## Safety

This snapshot is read-only. It does not generate a public release, push, publish, delete, expose secrets, or bypass approvals.
"""


def save_production_readiness_report() -> Dict[str, Any]:
    snapshot = generate_production_readiness_snapshot(); report = render_production_readiness_report(snapshot)
    path = PRODUCTION_DIR / f"PRODUCTION_READINESS_REPORT_{_stamp()}.md"; _atomic_write(path, report)
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report, "snapshot": snapshot}


def generate_final_release_candidate_v2() -> Dict[str, Any]:
    snapshot = generate_production_readiness_snapshot(); report = render_production_readiness_report(snapshot); stamp = _stamp()
    report_path = PRODUCTION_DIR / f"FINAL_RELEASE_CANDIDATE_V2_{stamp}.md"
    summary_path = PRODUCTION_DIR / f"FINAL_RELEASE_CANDIDATE_V2_SUMMARY_{stamp}.json"
    result = {key: snapshot[key] for key in ("status", "generated_at", "release_version", "readiness_score", "passed", "failed", "safety")}
    result.update({"release_name": "Final Release Candidate v2", "report_path": str(report_path), "summary_path": str(summary_path)})
    _atomic_write(report_path, report); _atomic_write(summary_path, json.dumps(result, indent=2, sort_keys=True))
    return result
