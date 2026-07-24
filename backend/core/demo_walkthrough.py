from datetime import datetime
from pathlib import Path
from typing import Any, Dict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEMO_DIR = PROJECT_ROOT / "backend" / "data" / "demo_walkthrough"
DEMO_DIR.mkdir(parents=True, exist_ok=True)
DEMO_STEPS = ["Open Aurora OS", "Show Dashboard Intelligence", "Switch to Security View", "Show Developer View", "Show Release View", "Show Portfolio Showcase", "Close with project summary"]
def _now() -> str: return datetime.now().isoformat(timespec="seconds")
def inspect_demo_walkthrough() -> Dict[str, Any]: return {"status": "ready", "generated_at": _now(), "step_count": len(DEMO_STEPS), "steps": DEMO_STEPS, "safety": {"presentation_only": True, "executes_tools": False, "publishes": False, "bypasses_approvals": False, "exposes_secrets": False}}
def render_demo_walkthrough_report() -> str:
    scan = inspect_demo_walkthrough(); steps = "\n".join(f"{index + 1}. {step}" for index, step in enumerate(scan["steps"])); safety = scan["safety"]
    return f"""# O.R.I.O.N. v5.3 Guided Portfolio Walkthrough Report

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
    report = render_demo_walkthrough_report(); path = DEMO_DIR / f"DEMO_WALKTHROUGH_REPORT_{datetime.now():%Y%m%d_%H%M%S}.md"; path.write_text(report, encoding="utf-8")
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report}
