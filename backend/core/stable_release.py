import json
from datetime import datetime
from pathlib import Path
from core.final_launch import load_final_launch_freeze_state
from core.github_launch import generate_github_launch_checklist,generate_release_draft
from core.production_readiness import generate_production_readiness_snapshot,generate_final_release_candidate_v2
from core.release_candidate import get_freeze_state
from core.release_verification import generate_release_verification_snapshot
OUT=Path(__file__).resolve().parents[1]/'data/stable_release';OUT.mkdir(parents=True,exist_ok=True);LOCK=OUT/'orion_version_lock.json';DEFAULT={'locked':False,'release_version':'v6.0','release_name':'Stable Public Release + Version Lock','release_status':'unlocked','locked_at':'','unlocked_at':'','lock_reason':'','updated_at':''}
def now():return datetime.now().isoformat(timespec='seconds')
def load_version_lock():
 if not LOCK.exists():return save_version_lock(DEFAULT.copy())
 try:return {**DEFAULT,**json.loads(LOCK.read_text())}
 except json.JSONDecodeError:return DEFAULT.copy()
def save_version_lock(s):s={**DEFAULT,**s,'updated_at':now()};LOCK.write_text(json.dumps(s,indent=2));return s
def lock_stable_release(reason='O.R.I.O.N. v6.0 stable public release lock.'):return save_version_lock({**load_version_lock(),'locked':True,'release_status':'stable_locked','locked_at':now(),'unlocked_at':'','lock_reason':reason})
def unlock_stable_release(reason='O.R.I.O.N. v6.0 stable release lock lifted.'):return save_version_lock({**load_version_lock(),'locked':False,'release_status':'unlocked','unlocked_at':now(),'lock_reason':reason})
def generate_stable_release_checklist():
 p=generate_production_readiness_snapshot();v=generate_release_verification_snapshot();g=generate_github_launch_checklist();f=load_final_launch_freeze_state();l=load_version_lock();checks=[{'name':'Production readiness acceptable','ok':p['status'] in ['production_ready','release_candidate'],'details':p['status']},{'name':'Production readiness score is high','ok':p['readiness_score']>=90,'details':str(p['readiness_score'])},{'name':'Release verification passed','ok':v['status']=='passed','details':v['status']},{'name':'Final launch freeze active','ok':bool(f['frozen']),'details':str(f['frozen'])},{'name':'GitHub launch acceptable','ok':g['failed']<=1,'details':str(g['failed'])},{'name':'Version lock active','ok':bool(l['locked']),'details':str(l['locked'])}];passed=sum(x['ok'] for x in checks);failed=len(checks)-passed;return {'status':'stable_release_ready' if not failed else 'release_review_needed' if failed<=2 else 'not_ready','generated_at':now(),'release_version':'v6.0','release_name':'Stable Public Release + Version Lock','passed':passed,'failed':failed,'checks':checks,'version_lock':l,'production':p,'verification':v,'github_launch':g,'safety':{'pushes_to_github':False,'publishes_release':False,'deletes_files':False,'exposes_secrets':False,'bypasses_approvals':False}}
def generate_final_public_changelog():return '# O.R.I.O.N. v6.0 Stable Public Release Changelog\n\nManual, approval-gated, local-first release.\n'
def generate_manual_github_release_workflow():return '# Manual GitHub Release Workflow\n\nRun checks, review staged files and secrets, then push manually only after review.\n'
def render_stable_release_report():
 s=generate_stable_release_checklist();return f"# O.R.I.O.N. v6.0 Stable Public Release Report\n\nStatus: {s['status']}\nPassed: {s['passed']}\nFailed: {s['failed']}\nLocked: {s['version_lock']['locked']}\n\nSafety: no push, publishing, deletion, secret exposure, or approval bypass.\n"
def save_stable_release_report():
 r=render_stable_release_report();p=OUT/f'STABLE_RELEASE_REPORT_{datetime.now():%Y%m%d_%H%M%S}.md';p.write_text(r);return {'status':'saved','generated_at':now(),'path':str(p),'report':r}
def generate_stable_release_package():
 s=generate_stable_release_checklist();t=datetime.now().strftime('%Y%m%d_%H%M%S');paths={k:OUT/f'{k}_{t}.md' for k in ['report','changelog','workflow','release_draft']};paths['report'].write_text(render_stable_release_report());paths['changelog'].write_text(generate_final_public_changelog());paths['workflow'].write_text(generate_manual_github_release_workflow());paths['release_draft'].write_text(generate_release_draft());summary={**s,'report_path':str(paths['report']),'changelog_path':str(paths['changelog']),'workflow_path':str(paths['workflow']),'release_draft_path':str(paths['release_draft']),'summary_path':str(OUT/f'STABLE_RELEASE_SUMMARY_{t}.json')};Path(summary['summary_path']).write_text(json.dumps(summary,indent=2));return summary
