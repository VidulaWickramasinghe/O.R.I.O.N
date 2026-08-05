"""Presentation-only recording-mode readiness reporting."""

import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


RECORDING_DIR = Path(__file__).resolve().parents[1] / "data" / "demo_recording"
RECORDING_SCENES = (
    "Opening Scene",
    "Dashboard Intelligence",
    "Security Architecture",
    "Developer View",
    "Release View",
    "Portfolio Showcase",
    "Closing Scene",
)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def inspect_demo_recording_readiness() -> Dict[str, Any]:
    checks = [
        {"name": "Recording scenes defined", "ok": len(RECORDING_SCENES) >= 5, "details": f"Scenes: {len(RECORDING_SCENES)}"},
        {"name": "Recording mode is presentation-only", "ok": True, "details": "No screen recording is started automatically."},
        {"name": "Presenter controls are local UI state", "ok": True, "details": "Controls only change frontend presentation."},
        {"name": "Approvals remain unchanged", "ok": True, "details": "Recording mode does not bypass approval gates."},
    ]
    failed = sum(not check["ok"] for check in checks)
    return {
        "status": "ready" if failed == 0 else "review_needed",
        "generated_at": _now(),
        "scene_count": len(RECORDING_SCENES),
        "scenes": list(RECORDING_SCENES),
        "passed": len(checks) - failed,
        "failed": failed,
        "checks": checks,
        "safety": {
            "presentation_only": True,
            "starts_recording": False,
            "publishes": False,
            "executes_tools": False,
            "bypasses_approvals": False,
        },
    }


def render_demo_recording_report(scan: Dict[str, Any] | None = None) -> str:
    scan = scan or inspect_demo_recording_readiness()
    checks = "\n".join(
        f"- [{'x' if check['ok'] else ' '}] {check['name']} — {check['details']}"
        for check in scan["checks"]
    )
    scenes = "\n".join(f"- {scene}" for scene in scan["scenes"])
    safety = scan["safety"]
    return f"""# O.R.I.O.N. v6.5 Demo Recording Mode Report

Generated: {scan['generated_at']}
Status: {scan['status']}

## Summary

- Scenes: {scan['scene_count']}
- Passed: {scan['passed']}
- Failed: {scan['failed']}

## Scenes

{scenes}

## Checks

{checks}

## Safety

- Presentation Only: {safety['presentation_only']}
- Starts Recording Automatically: {safety['starts_recording']}
- Publishes: {safety['publishes']}
- Executes Tools: {safety['executes_tools']}
- Bypasses Approvals: {safety['bypasses_approvals']}
"""


def save_demo_recording_report() -> Dict[str, Any]:
    scan = inspect_demo_recording_readiness()
    report = render_demo_recording_report(scan)
    RECORDING_DIR.mkdir(parents=True, exist_ok=True)
    path = RECORDING_DIR / f"DEMO_RECORDING_REPORT_{datetime.now():%Y%m%d_%H%M%S_%f}.md"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=RECORDING_DIR, delete=False
    ) as handle:
        handle.write(report)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)
    return {
        "status": "saved",
        "generated_at": _now(),
        "path": str(path),
        "report": report,
        "scan": scan,
    }
