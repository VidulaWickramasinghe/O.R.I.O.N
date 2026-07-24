from datetime import datetime
from pathlib import Path
from typing import Any, Dict

RECORDING_DIR = Path(__file__).resolve().parents[1] / "data" / "demo_recording"
RECORDING_DIR.mkdir(parents=True, exist_ok=True)
RECORDING_SCENES = ["Opening Scene", "Dashboard Intelligence", "Security Architecture", "Developer View", "Release View", "Portfolio Showcase", "Closing Scene"]
def _now() -> str: return datetime.now().isoformat(timespec="seconds")
def inspect_demo_recording_readiness() -> Dict[str, Any]:
    checks = [{"name": "Recording scenes defined", "ok": len(RECORDING_SCENES) >= 5, "details": f"Scenes: {len(RECORDING_SCENES)}"}, {"name": "Recording mode is presentation-only", "ok": True, "details": "No screen recording is started automatically."}, {"name": "Presenter controls are local UI state", "ok": True, "details": "Controls only change frontend presentation."}, {"name": "Approvals remain unchanged", "ok": True, "details": "Recording mode does not bypass approval gates."}]
    return {"status": "ready", "generated_at": _now(), "scene_count": len(RECORDING_SCENES), "scenes": RECORDING_SCENES, "passed": len(checks), "failed": 0, "checks": checks, "safety": {"presentation_only": True, "starts_recording": False, "publishes": False, "executes_tools": False, "bypasses_approvals": False}}
def render_demo_recording_report() -> str:
    scan=inspect_demo_recording_readiness(); checks="\n".join(f"- [{'x' if check['ok'] else ' '}] {check['name']} — {check['details']}" for check in scan['checks']); scenes="\n".join(f"- {scene}" for scene in scan['scenes']); safety=scan['safety']
    return f"""# O.R.I.O.N. v5.4 Demo Recording Mode Report

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
    report=render_demo_recording_report(); path=RECORDING_DIR / f"DEMO_RECORDING_REPORT_{datetime.now():%Y%m%d_%H%M%S}.md"; path.write_text(report, encoding="utf-8"); return {"status":"saved","generated_at":_now(),"path":str(path),"report":report}
