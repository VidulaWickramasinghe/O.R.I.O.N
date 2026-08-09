"""Local-only known issue triage and maintenance planning."""
from __future__ import annotations
import json, os, tempfile, threading, uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
from core.stable_release import generate_stable_release_checklist, load_version_lock
from core.production_readiness import generate_production_readiness_snapshot
from core.release_verification import generate_release_verification_snapshot

ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'backend/data/post_release_maintenance'; ISSUES=OUT/'known_issues.json'; RELEASE_VERSION='v6.5'; _LOCK=threading.RLock(); DEFAULT={'issues':[],'updated_at':''}; PRIORITIES={'critical','high','medium','low'}
def _now(): return datetime.now().isoformat(timespec='seconds')
def _stamp(): return datetime.now().strftime('%Y%m%d_%H%M%S_%f')
def _atomic(path:Path,content:str):
 path.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=path.parent,delete=False) as handle: handle.write(content); temporary=Path(handle.name)
 os.replace(temporary,path)
def _text(value:str,name:str,limit:int,required=False):
 value=value.strip()
 if required and not value: raise ValueError(f'{name} is required.')
 if len(value)>limit: raise ValueError(f'{name} must be {limit} characters or fewer.')
 return value
def _normalize_issue(value:Any):
 if not isinstance(value,dict): return None
 title=str(value.get('title','')).strip()
 if not title: return None
 priority=value.get('priority') if value.get('priority') in PRIORITIES else 'medium'
 return {'id':str(value.get('id',''))[:80], 'title':title[:200], 'body':str(value.get('body',''))[:5000], 'source':str(value.get('source','manual'))[:40], 'status':'closed' if value.get('status')=='closed' else 'open', 'category':str(value.get('category','general'))[:40], 'priority':priority, 'suggested_action':str(value.get('suggested_action','Review manually.'))[:500], 'created_at':str(value.get('created_at',''))[:32], 'updated_at':str(value.get('updated_at',''))[:32]}
def load_known_issues():
 try: raw=json.loads(ISSUES.read_text(encoding='utf-8'))
 except (OSError,json.JSONDecodeError): return DEFAULT.copy()
 issues=[item for item in (_normalize_issue(x) for x in raw.get('issues',[]) if isinstance(raw,dict)) if item]
 return {'issues':issues,'updated_at':str(raw.get('updated_at',''))[:32]}
def save_known_issues(data):
 normalized={'issues':[item for item in (_normalize_issue(x) for x in data.get('issues',[])) if item], 'updated_at':_now()}; _atomic(ISSUES,json.dumps(normalized,indent=2,sort_keys=True)); return normalized
def classify_issue_text(title,body=''):
 title=_text(title,'Title',200,True); body=_text(body,'Body',5000); text=f'{title} {body}'.casefold()
 rules=[('security','critical',('security','secret','token','api key','permission','approval'),'Review immediately; confirm secrets and approval gates are intact.'),('bug','high',('crash','broken','error','exception','failed','bug'),'Reproduce locally and add a regression test before patching.'),('documentation','low',('docs','readme','typo','documentation','guide'),'Update documentation in the next reviewed patch.'),('ui','medium',('mobile','responsive','layout','ui','design'),'Reproduce at the target viewport and patch the layout safely.'),('feature','medium',('feature','request','improve','enhancement','add'),'Add to the roadmap unless required for safety or stability.')]
 category,priority,action='general','medium','Review manually before the next patch.'
 for candidate,level,words,suggestion in rules:
  if any(word in text for word in words): category,priority,action=candidate,level,suggestion; break
 return {'title':title,'category':category,'priority':priority,'suggested_action':action,'classified_at':_now()}
def add_known_issue(title,body='',source='manual'):
 body=_text(body,'Body',5000); source=_text(source,'Source',40,True); classification=classify_issue_text(title,body); now=_now()
 issue={'id':f'issue_{uuid.uuid4().hex}','title':classification['title'],'body':body,'source':source,'status':'open','category':classification['category'],'priority':classification['priority'],'suggested_action':classification['suggested_action'],'created_at':now,'updated_at':now}
 with _LOCK:
  data=load_known_issues(); data['issues'].append(issue); save_known_issues(data)
 return issue
def generate_patch_plan(issues_data=None):
 data=issues_data or load_known_issues(); issues=[x.copy() for x in data['issues'] if x.get('status')=='open']; counts={p:sum(x['priority']==p for x in issues) for p in PRIORITIES}
 return {'status':'patch_needed' if issues else 'clean','generated_at':_now(),'recommended_patch':'v6.5.2' if issues else 'no_patch_needed','open_count':len(issues),**{f'{p}_count':counts[p] for p in ('critical','high','medium','low')},'open_issues':issues,'patch_steps':['Review and reproduce open issues.','Resolve critical and high risks first.','Patch one risk area at a time.','Add regression coverage.','Run backend, frontend, and quality-gate checks.','Commit only reviewed changes.']}
def generate_maintenance_snapshot():
 stable=generate_stable_release_checklist(); production=generate_production_readiness_snapshot(); verification=generate_release_verification_snapshot(); version_lock=load_version_lock(); plan=generate_patch_plan()
 raw=[('Stable release lock active',version_lock.get('locked') is True,f"Locked: {version_lock.get('locked')}"),('Stable baseline ready',stable.get('status')=='stable_release_ready',f"Status: {stable.get('status')}"),('Production snapshot available',production.get('status') in {'production_ready','release_candidate','review_needed'},f"Status: {production.get('status')}"),('Release verification passed',verification.get('status')=='passed',f"Status: {verification.get('status')}"),('No open critical issues',plan['critical_count']==0,f"Critical: {plan['critical_count']}")]; checks=[{'name':n,'ok':bool(ok),'details':details} for n,ok,details in raw]; passed=sum(x['ok'] for x in checks)
 status='critical_review_needed' if plan['critical_count'] else 'maintenance_needed' if plan['open_count'] else 'stable_maintenance_clean'
 return {'status':status,'generated_at':_now(),'release_version':RELEASE_VERSION,'release_name':'Post-Release Maintenance + Issue Triage Mode','passed':passed,'failed':len(checks)-passed,'checks':checks,'version_lock':version_lock,'stable_release':{'status':stable.get('status'),'passed':stable.get('passed'),'failed':stable.get('failed')},'production':{'status':production.get('status'),'readiness_score':production.get('readiness_score')},'patch_plan':plan,'safety':{'pushes_to_github':False,'publishes_release':False,'modifies_github_issues':False,'deletes_files':False,'bypasses_approvals':False}}
def render_maintenance_report(snapshot=None):
 snapshot=snapshot or generate_maintenance_snapshot(); lines='\n'.join(f"- [{'x' if x['ok'] else ' '}] {x['name']} — {x['details']}" for x in snapshot['checks']); issues='\n'.join(f"- [{x['priority']}] {x['title']} — {x['category']}" for x in snapshot['patch_plan']['open_issues']) or 'None'
 return f"# O.R.I.O.N. {RELEASE_VERSION} Post-Release Maintenance Report\n\nGenerated: {snapshot['generated_at']}\nStatus: {snapshot['status']}\n\n## Checks\n\n{lines}\n\n## Open Issues\n\n{issues}\n\n## Safety\n\nLocal triage only; no GitHub changes, push, publishing, deletion, or approval bypass.\n"
def save_maintenance_report():
 snapshot=generate_maintenance_snapshot(); report=render_maintenance_report(snapshot); path=OUT/f'POST_RELEASE_MAINTENANCE_REPORT_{_stamp()}.md'; _atomic(path,report); return {'status':'saved','generated_at':_now(),'path':str(path),'report':report,'snapshot':snapshot}
