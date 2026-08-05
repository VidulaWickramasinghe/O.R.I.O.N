"""Presentation-only guided walkthrough readiness reporting."""

import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


DEMO_DIR = Path(__file__).resolve().parents[1] / "data" / "demo_walkthrough"
DEMO_STEPS = (
    "Open Aurora OS",
    "Show Dashboard Intelligence",
    "Switch to Security View",
    "Show Developer View",
    "Show Release View",
    "Show Portfolio Showcase",
    "Close with project summary",
)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def inspect_demo_walkthrough() -> Dict[str, Any]:
    return {
        "status": "ready" if DEMO_STEPS else "review_needed",
        "generated_at": _now(),
        "step_count": len(DEMO_STEPS),
        "steps": list(DEMO_STEPS),
        "safety": {
            "presentation_only": True,
            "executes_tools": False,
            "publishes": False,
            "bypasses_approvals": False,
            "exposes_secrets": False,
        },
    }


def render_demo_walkthrough_report(scan: Dict[str, Any] | None = None) -> str:
    scan = scan or inspect_demo_walkthrough()
    steps = "\n".join(
        f"{index + 1}. {step}" for index, step in enumerate(scan["steps"])
    )
    safety = scan["safety"]
    return f"""# O.R.I.O.N. v6.5 Guided Portfolio Walkthrough Report

Generated: {scan['generated_at']}
Status: {scan['status']}

## Demo Steps

{steps}

## Safety

- Presentation Only: {safety['presentation_only']}
- Executes Tools: {safety['executes_tools']}
- Publishes: {safety['publishes']}
- Bypasses Approvals: {safety['bypasses_approvals']}
- Exposes Secrets: {safety['exposes_secrets']}
"""


def save_demo_walkthrough_report() -> Dict[str, Any]:
    scan = inspect_demo_walkthrough()
    report = render_demo_walkthrough_report(scan)
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    path = DEMO_DIR / f"DEMO_WALKTHROUGH_REPORT_{datetime.now():%Y%m%d_%H%M%S_%f}.md"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=DEMO_DIR, delete=False
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
