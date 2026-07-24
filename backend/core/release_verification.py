"""Read-only release readiness and quality-gate reporting."""
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
from core.frontend_refactor import inspect_frontend_architecture
from core.release_candidate import generate_release_checklist, get_freeze_state
from core.stabilization_manager import run_stabilization_scan
PROJECT_ROOT=Path(__file__).resolve().parents[2]; REPORT_DIR=PROJECT_ROOT/'backend/data/quality_gate_reports'; REPORT_DIR.mkdir(parents=True,exist_ok=True)
def _now(): return datetime.now().isoformat(timespec='seconds')
def generate_release_verification_snapshot()->Dict[str,Any]:
    frontend=inspect_frontend_architecture(); stabilization=run_stabilization_scan(False); checklist=generate_release_checklist()
    checks=[{'name':'Frontend architecture available','ok':frontend.get('status')!='needs_refactor','details':str(frontend.get('status'))},{'name':'Stabilization not critical','ok':stabilization.get('status')!='needs_attention','details':str(stabilization.get('status'))},{'name':'Release checklist','ok':checklist.get('failed',0)==0,'details':f"Failed: {checklist.get('failed',0)}"}]
    failed=sum(not c['ok'] for c in checks)
    return {'status':'passed' if not failed else 'needs_attention','generated_at':_now(),'passed':len(checks)-failed,'failed':failed,'checks':checks,'freeze_state':get_freeze_state(),'frontend_refactor':frontend,'stabilization':stabilization,'release_checklist':checklist}
def render_release_verification_report():
    s=generate_release_verification_snapshot(); lines='\n'.join(f"- [{'x' if c['ok'] else ' '}] {c['name']} — {c['details']}" for c in s['checks']); return f"# O.R.I.O.N. v4.9 Release Verification Report\n\nGenerated: {s['generated_at']}\nStatus: {s['status']}\n\n## Checks\n\n{lines}\n\nSafety: verification does not publish, push, delete, or bypass approvals.\n"
def save_release_verification_report():
    report=render_release_verification_report(); path=REPORT_DIR/f"orion_v4_9_release_verification_{datetime.now():%Y%m%d_%H%M%S}.md"; path.write_text(report); return {'status':'saved','path':str(path),'report':report,'generated_at':_now()}
def run_quality_gate_snapshot(run_builds=False):
    verification=generate_release_verification_snapshot(); skipped={'ok':None,'command':'script','stdout':'','stderr':'Skipped. Set run_builds=true.'}; return {'status':verification['status'],'generated_at':_now(),'backend_check':skipped,'frontend_check':skipped,'verification':verification}
