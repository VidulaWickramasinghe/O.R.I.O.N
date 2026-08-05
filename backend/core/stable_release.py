"""Local stable-release marker and reviewable artifact preparation."""
from __future__ import annotations
import json, os, tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
from core.final_launch import load_final_launch_freeze_state
from core.github_launch import generate_github_launch_checklist, generate_release_draft
from core.production_readiness import generate_final_release_candidate_v2, generate_production_readiness_snapshot
from core.release_candidate import get_freeze_state
from core.release_verification import generate_release_verification_snapshot

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "backend" / "data" / "stable_release"
LOCK = OUT / "orion_version_lock.json"
RELEASE_VERSION = "v6.5"
RELEASE_NAME = "Stable Public Release + Version Lock"
DEFAULT = {"locked": False, "release_version": RELEASE_VERSION, "release_name": RELEASE_NAME, "release_status": "unlocked", "locked_at": "", "unlocked_at": "", "lock_reason": "", "updated_at": ""}

def _now(): return datetime.now().isoformat(timespec="seconds")
def _stamp(): return datetime.now().strftime("%Y%m%d_%H%M%S_%f")
def _atomic(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle: handle.write(content); temporary=Path(handle.name)
    os.replace(temporary, path)
def _reason(value: str) -> str:
    value=value.strip()
    if not value: raise ValueError("Lock reason is required.")
    if len(value)>500: raise ValueError("Lock reason must be 500 characters or fewer.")
    return value
def _normalize(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict): return DEFAULT.copy()
    return {**DEFAULT, "locked": value.get("locked") is True, "release_status": "stable_locked" if value.get("locked") is True else "unlocked", "locked_at": str(value.get("locked_at", ""))[:32], "unlocked_at": str(value.get("unlocked_at", ""))[:32], "lock_reason": str(value.get("lock_reason", ""))[:500], "updated_at": str(value.get("updated_at", ""))[:32]}
def load_version_lock() -> Dict[str, Any]:
    try: return _normalize(json.loads(LOCK.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError): return DEFAULT.copy()
def save_version_lock(state: Dict[str, Any]) -> Dict[str, Any]:
    state=_normalize(state); state["updated_at"]=_now(); _atomic(LOCK, json.dumps(state, indent=2, sort_keys=True)); return state
def lock_stable_release(reason="O.R.I.O.N. stable public release lock."):
    state=load_version_lock(); state.update({"locked": True, "release_status": "stable_locked", "locked_at": _now(), "unlocked_at": "", "lock_reason": _reason(reason)}); return save_version_lock(state)
def unlock_stable_release(reason="O.R.I.O.N. stable release lock lifted."):
    state=load_version_lock(); state.update({"locked": False, "release_status": "unlocked", "unlocked_at": _now(), "lock_reason": _reason(reason)}); return save_version_lock(state)

def generate_stable_release_checklist() -> Dict[str, Any]:
    production=generate_production_readiness_snapshot(); verification=generate_release_verification_snapshot(); github=generate_github_launch_checklist(); final=load_final_launch_freeze_state(); candidate=get_freeze_state(); lock=load_version_lock()
    raw=[("Production readiness complete", production.get("status")=="production_ready", f"Score: {production.get('readiness_score')}%"), ("Release verification passed", verification.get("status")=="passed", f"Status: {verification.get('status')}"), ("Final launch freeze active", final.get("frozen") is True, f"Frozen: {final.get('frozen')}"), ("Release candidate freeze active", candidate.get("frozen") is True, f"Frozen: {candidate.get('frozen')}"), ("GitHub launch clean", github.get("failed")==0, f"Failed: {github.get('failed')}"), ("Version lock active", lock.get("locked") is True, f"Locked: {lock.get('locked')}")]
    checks=[{"name": n, "ok": bool(ok), "details": details} for n,ok,details in raw]; passed=sum(item["ok"] for item in checks); failed=len(checks)-passed
    return {"status": "stable_release_ready" if failed==0 else "release_review_needed" if failed<=2 else "not_ready", "generated_at": _now(), "release_version": RELEASE_VERSION, "release_name": RELEASE_NAME, "passed": passed, "failed": failed, "checks": checks, "version_lock": lock, "production": {"status": production.get("status"), "readiness_score": production.get("readiness_score"), "passed": production.get("passed"), "failed": production.get("failed")}, "verification": {"status": verification.get("status"), "passed": verification.get("passed"), "failed": verification.get("failed")}, "github_launch": {"status": github.get("status"), "passed": github.get("passed"), "failed": github.get("failed")}, "safety": {"pushes_to_github": False, "publishes_release": False, "deletes_files": False, "exposes_secrets": False, "bypasses_approvals": False}}

def generate_final_public_changelog(): return f"# O.R.I.O.N. {RELEASE_VERSION} Stable Public Release Changelog\n\nLocal-first, approval-gated, manually published stable release.\n"
def generate_manual_github_release_workflow(): return "# Manual GitHub Release Workflow\n\n1. Run `./scripts/quality_gate.sh`.\n2. Review `git status` and staged files.\n3. Scan for secrets.\n4. Commit and push only after manual approval.\n"
def render_stable_release_report(checklist=None):
    checklist=checklist or generate_stable_release_checklist(); lines="\n".join(f"- [{'x' if c['ok'] else ' '}] {c['name']} — {c['details']}" for c in checklist["checks"])
    return f"# O.R.I.O.N. {RELEASE_VERSION} Stable Public Release Report\n\nGenerated: {checklist['generated_at']}\nStatus: {checklist['status']}\nPassed: {checklist['passed']}\nFailed: {checklist['failed']}\n\n## Checklist\n\n{lines}\n\n## Safety\n\nThe version lock is a local marker, not an immutable Git lock. No push or publishing is performed.\n"
def save_stable_release_report():
    checklist=generate_stable_release_checklist(); report=render_stable_release_report(checklist); path=OUT/f"STABLE_RELEASE_REPORT_{_stamp()}.md"; _atomic(path,report); return {"status":"saved","generated_at":_now(),"path":str(path),"report":report,"checklist":checklist}
def generate_stable_release_package():
    checklist=generate_stable_release_checklist()
    if not checklist["version_lock"]["locked"]: raise ValueError("Stable release must be locked before packaging.")
    stamp=_stamp(); report=render_stable_release_report(checklist); paths={"report_path":OUT/f"ORION_STABLE_RELEASE_REPORT_{stamp}.md","changelog_path":OUT/f"ORION_PUBLIC_CHANGELOG_{stamp}.md","workflow_path":OUT/f"ORION_MANUAL_GITHUB_RELEASE_WORKFLOW_{stamp}.md","release_draft_path":OUT/f"ORION_GITHUB_RELEASE_DRAFT_{stamp}.md"}
    _atomic(paths["report_path"],report); _atomic(paths["changelog_path"],generate_final_public_changelog()); _atomic(paths["workflow_path"],generate_manual_github_release_workflow()); _atomic(paths["release_draft_path"],generate_release_draft())
    rc=generate_final_release_candidate_v2(); summary={"status":checklist["status"],"generated_at":_now(),"release_version":RELEASE_VERSION,"release_name":RELEASE_NAME,"passed":checklist["passed"],"failed":checklist["failed"],**{k:str(v) for k,v in paths.items()},"final_release_candidate_v2":rc,"safety":checklist["safety"]}; summary_path=OUT/f"ORION_STABLE_RELEASE_SUMMARY_{stamp}.json"; summary["summary_path"]=str(summary_path); _atomic(summary_path,json.dumps(summary,indent=2,sort_keys=True)); return summary
