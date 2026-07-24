import json
from datetime import datetime
from pathlib import Path
from core.demo_recording import inspect_demo_recording_readiness
from core.demo_walkthrough import inspect_demo_walkthrough
from core.final_launch import generate_final_launch_checklist,load_final_launch_freeze_state
from core.frontend_refactor import inspect_frontend_architecture
from core.github_launch import generate_github_launch_checklist
from core.github_polish import generate_github_polish_checklist
from core.portfolio_showcase import inspect_portfolio_showcase
from core.public_landing import inspect_public_landing
from core.public_release import generate_public_release_package
from core.release_candidate import generate_release_checklist,get_freeze_state
from core.release_verification import generate_release_verification_snapshot
from core.stabilization_manager import run_stabilization_scan
from core.ui_polish import inspect_ui_polish
OUT=Path(__file__).resolve().parents[1]/'data/production_readiness';OUT.mkdir(parents=True,exist_ok=True)
def now():return datetime.now().isoformat(timespec='seconds')
def snapshot():
 s=run_stabilization_scan(run_build=False);f=inspect_frontend_architecture();v=generate_release_verification_snapshot();r=generate_release_checklist();fl=generate_final_launch_checklist();gf=load_final_launch_freeze_state();gh=generate_github_launch_checklist();gp=generate_github_polish_checklist();pl=inspect_public_landing();ui=inspect_ui_polish();dr=inspect_demo_recording_readiness();dw=inspect_demo_walkthrough();ps=inspect_portfolio_showcase();pub=generate_public_release_package(); raw=[('Backend stabilization acceptable',s.get('status')!='needs_attention'),('Frontend resilience ready',bool(f.get('resilience_ready'))),('Release verification passed',v.get('status')=='passed'),('Release checklist clean',r.get('failed',0)==0),('Final launch freeze active',bool(gf.get('frozen'))),('Final launch acceptable',fl.get('failed',99)<=1),('GitHub launch acceptable',gh.get('failed',99)<=1),('GitHub polish acceptable',gp.get('failed',99)<=1),('Public landing page ready',pl.get('status')=='ready'),('UI polish mobile ready',bool(ui.get('mobile_ready'))),('Demo recording ready',dr.get('status')=='ready'),('Guided walkthrough ready',dw.get('status')=='ready'),('Portfolio showcase available',ps.get('status') in ['ready','screenshots_needed']),('Public release package generated',pub.get('status') in ['generated','ready'])];checks=[{'name':n,'ok':o,'details':str(o)} for n,o in raw];passed=sum(x['ok'] for x in checks);failed=len(checks)-passed;return {'status':'production_ready' if not failed else 'release_candidate' if failed<=2 else 'review_needed','generated_at':now(),'release_version':'v5.9','release_name':'Production Readiness Snapshot + Final Release Candidate v2','readiness_score':round(passed/len(checks)*100),'passed':passed,'failed':failed,'checks':checks,'stabilization':{'status':s.get('status')},'frontend':{'status':f.get('status'),'resilience_ready':f.get('resilience_ready')},'release':{'verification_status':v.get('status')},'launch':{'final_launch_status':fl.get('status'),'github_launch_status':gh.get('status')},'presentation':{'public_landing_status':pl.get('status'),'ui_polish_status':ui.get('status'),'demo_recording_status':dr.get('status'),'demo_walkthrough_status':dw.get('status')},'public_release':{'status':pub.get('status')},'safety':{'pushes_to_github':False,'publishes_release':False,'deletes_files':False,'exposes_secrets':False,'bypasses_approvals':False}}
def generate_production_readiness_snapshot():return snapshot()
def render_production_readiness_report():
 s=snapshot();return f"# O.R.I.O.N. v5.9 Production Readiness Snapshot\n\nStatus: {s['status']}\nReadiness Score: {s['readiness_score']}%\n\nSafety: verification only; no publishing, push, deletion, secrets, or approval bypass.\n"
def save_production_readiness_report():
 r=render_production_readiness_report();p=OUT/f'PRODUCTION_READINESS_REPORT_{datetime.now():%Y%m%d_%H%M%S}.md';p.write_text(r);return {'status':'saved','generated_at':now(),'path':str(p),'report':r}
def generate_final_release_candidate_v2():
 s=snapshot();t=datetime.now().strftime('%Y%m%d_%H%M%S');rp=OUT/f'FINAL_RELEASE_CANDIDATE_V2_{t}.md';sp=OUT/f'FINAL_RELEASE_CANDIDATE_V2_SUMMARY_{t}.json';rp.write_text(render_production_readiness_report());d={**s,'report_path':str(rp),'summary_path':str(sp)};sp.write_text(json.dumps(d,indent=2));return d
