import json
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
FINAL_LAUNCH_DIR=Path(__file__).resolve().parents[1]/"data"/"final_launch"; FINAL_LAUNCH_DIR.mkdir(parents=True,exist_ok=True)
FREEZE_STATE_FILE=FINAL_LAUNCH_DIR/"final_launch_freeze_state.json"
DEFAULT_FREEZE_STATE={"frozen":False,"release_version":"v5.5","release_name":"Final Public Launch Checklist + Repository Freeze","freeze_reason":"","frozen_at":"","unfrozen_at":"","updated_at":""}
def _now(): return datetime.now().isoformat(timespec="seconds")
def _timestamp(): return datetime.now().strftime("%Y%m%d_%H%M%S")
def load_final_launch_freeze_state():
 if not FREEZE_STATE_FILE.exists(): return save_final_launch_freeze_state(DEFAULT_FREEZE_STATE.copy())
 try: return {**DEFAULT_FREEZE_STATE,**json.loads(FREEZE_STATE_FILE.read_text(encoding="utf-8"))}
 except (OSError,json.JSONDecodeError): return DEFAULT_FREEZE_STATE.copy()
def save_final_launch_freeze_state(state):
 state={**DEFAULT_FREEZE_STATE,**state,"updated_at":_now()}; FREEZE_STATE_FILE.write_text(json.dumps(state,indent=2),encoding="utf-8"); return state
def freeze_final_launch(reason="Final public portfolio launch preparation."): return save_final_launch_freeze_state({**load_final_launch_freeze_state(),"frozen":True,"freeze_reason":reason,"frozen_at":_now(),"unfrozen_at":""})
def unfreeze_final_launch(reason="Final launch freeze lifted."): return save_final_launch_freeze_state({**load_final_launch_freeze_state(),"frozen":False,"freeze_reason":reason,"unfrozen_at":_now()})
def generate_final_launch_checklist()->Dict[str,Any]:
 stabilization=run_stabilization_scan(run_build=False); frontend=inspect_frontend_architecture(); github=generate_github_polish_checklist(); portfolio=inspect_portfolio_showcase(); walkthrough=inspect_demo_walkthrough(); recording=inspect_demo_recording_readiness(); verification=generate_release_verification_snapshot(); release=generate_release_checklist(); final=load_final_launch_freeze_state(); release_freeze=get_freeze_state()
 checks=[("Repository final launch freeze active",bool(final["frozen"]),f"Frozen: {final['frozen']}"),("Stabilization scan not critical",stabilization.get("status")!="needs_attention",f"Status: {stabilization.get('status')}"),("Frontend architecture ready",frontend.get("status") in ["healthy","improving","page_too_large"],f"Status: {frontend.get('status')}"),("Frontend resilience ready",bool(frontend.get("resilience_ready")),f"Resilience Ready: {frontend.get('resilience_ready')}"),("GitHub polish reviewed",github.get("failed",0)<=1,f"Failed: {github.get('failed')}"),("Portfolio showcase available",portfolio.get("status") in ["ready","screenshots_needed"],f"Status: {portfolio.get('status')}"),("Guided walkthrough ready",walkthrough.get("status")=="ready",f"Steps: {walkthrough.get('step_count')}"),("Demo recording mode ready",recording.get("status")=="ready",f"Scenes: {recording.get('scene_count')}"),("Release verification passed",verification.get("status")=="passed",f"Failed: {verification.get('failed')}"),("Release candidate checklist has no failures",release.get("failed",0)==0,f"Failed: {release.get('failed')}"),("Release Candidate freeze available","frozen" in release_freeze,f"Frozen: {release_freeze.get('frozen')}")]
 checks=[{"name":n,"ok":ok,"details":d} for n,ok,d in checks]; passed=sum(c["ok"] for c in checks)
 return {"status":"launch_ready" if passed==len(checks) else "review_needed","generated_at":_now(),"passed":passed,"failed":len(checks)-passed,"checks":checks,"final_freeze":final,"release_freeze":release_freeze}
def render_final_launch_report():
 c=generate_final_launch_checklist(); lines="\n".join(f"- [{'x' if x['ok'] else ' '}] {x['name']} — {x['details']}" for x in c['checks']); return f"# O.R.I.O.N. v5.5 Final Public Launch Report\n\nGenerated: {c['generated_at']}\nStatus: {c['status']}\n\n## Summary\n\n- Passed: {c['passed']}\n- Failed: {c['failed']}\n\n## Final Launch Checklist\n\n{lines}\n\n## Safety\n\nThis report does not push, publish, delete, expose secrets, or bypass approvals.\n"
def save_final_launch_report():
 report=render_final_launch_report(); path=FINAL_LAUNCH_DIR/f"FINAL_LAUNCH_REPORT_{_timestamp()}.md"; path.write_text(report,encoding="utf-8"); return {"status":"saved","generated_at":_now(),"path":str(path),"report":report}
def generate_final_launch_package():
 c=generate_final_launch_checklist(); report=render_final_launch_report(); stamp=_timestamp(); report_path=FINAL_LAUNCH_DIR/f"FINAL_PUBLIC_LAUNCH_{stamp}.md"; summary_path=FINAL_LAUNCH_DIR/f"FINAL_PUBLIC_LAUNCH_SUMMARY_{stamp}.json"
 try: public=generate_public_release_package()
 except Exception as error: public={"status":"failed","error":str(error)}
 result={"status":c["status"],"generated_at":_now(),"release_version":"v5.5","release_name":"Final Public Launch Checklist + Repository Freeze","passed":c["passed"],"failed":c["failed"],"report_path":str(report_path),"summary_path":str(summary_path),"public_release":public,"safety":{"pushes_to_github":False,"publishes_release":False,"deletes_files":False,"bypasses_approvals":False}}
 report_path.write_text(report,encoding="utf-8");summary_path.write_text(json.dumps(result,indent=2),encoding="utf-8");return result
