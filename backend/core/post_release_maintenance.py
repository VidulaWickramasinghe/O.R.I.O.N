import json
from datetime import datetime
from pathlib import Path
from core.stable_release import generate_stable_release_checklist,load_version_lock
from core.production_readiness import generate_production_readiness_snapshot
from core.release_verification import generate_release_verification_snapshot
OUT=Path(__file__).resolve().parents[1]/'data/post_release_maintenance';OUT.mkdir(parents=True,exist_ok=True);ISSUES=OUT/'known_issues.json'
def now():return datetime.now().isoformat(timespec='seconds')
def load_known_issues():
 if not ISSUES.exists(): return save_known_issues({'issues':[],'updated_at':''})
 try:return json.loads(ISSUES.read_text())
 except json.JSONDecodeError:return {'issues':[],'updated_at':''}
def save_known_issues(d):d['updated_at']=now();ISSUES.write_text(json.dumps(d,indent=2));return d
def classify_issue_text(title,body=''):
 t=(title+' '+body).lower();category,priority='general','medium';action='Review manually before the next patch.'
 if any(x in t for x in ['security','secret','token','api key','permission','approval']):category,priority,action='security','critical','Review immediately; confirm secrets and approval gates are intact.'
 elif any(x in t for x in ['crash','broken','error','exception','failed','bug']):category,priority,action='bug','high','Reproduce locally and patch safely with a regression note.'
 elif any(x in t for x in ['docs','readme','typo','documentation','guide']):category,priority,action='documentation','low','Update documentation in the next maintenance patch.'
 elif any(x in t for x in ['mobile','responsive','layout','ui','design']):category,priority,action='ui','medium','Reproduce on target screen size and patch layout safely.'
 elif any(x in t for x in ['feature','request','improve','enhancement','add']):category,priority,action='feature','medium','Add to roadmap unless it affects safety or stability.'
 return {'title':title,'category':category,'priority':priority,'suggested_action':action,'classified_at':now()}
def add_known_issue(title,body='',source='manual'):
 d=load_known_issues();c=classify_issue_text(title,body);issue={'id':f"issue_{datetime.now():%Y%m%d_%H%M%S%f}",'title':title,'body':body,'source':source,'status':'open',**c,'created_at':now(),'updated_at':now()};d['issues'].append(issue);save_known_issues(d);return issue
def generate_patch_plan():
 issues=[x for x in load_known_issues()['issues'] if x.get('status')=='open'];counts={p:sum(x['priority']==p for x in issues) for p in ['critical','high','medium','low']};return {'status':'patch_needed' if issues else 'clean','generated_at':now(),'recommended_patch':'v6.0.1' if issues else 'no_patch_needed','open_count':len(issues),'critical_count':counts['critical'],'high_count':counts['high'],'medium_count':counts['medium'],'low_count':counts['low'],'open_issues':issues,'patch_steps':['Review open issues.','Reproduce critical and high priority bugs locally.','Patch one risk area at a time.','Run tests and quality gate.','Commit only reviewed changes.']}
def generate_maintenance_snapshot():
 stable=generate_stable_release_checklist();production=generate_production_readiness_snapshot();verify=generate_release_verification_snapshot();lock=load_version_lock();plan=generate_patch_plan();checks=[{'name':'Stable release lock exists','ok':'locked' in lock,'details':str(lock.get('locked'))},{'name':'Stable release acceptable','ok':stable['status'] in ['stable_release_ready','release_review_needed'],'details':stable['status']},{'name':'Production readiness acceptable','ok':production['status'] in ['production_ready','release_candidate'],'details':production['status']},{'name':'Release verification available','ok':verify['status'] in ['passed','needs_attention'],'details':verify['status']},{'name':'Open critical issues controlled','ok':plan['critical_count']==0,'details':str(plan['critical_count'])}];passed=sum(x['ok'] for x in checks);status='critical_review_needed' if plan['critical_count'] else 'maintenance_needed' if plan['open_count'] else 'stable_maintenance_clean';return {'status':status,'generated_at':now(),'release_version':'v6.1','release_name':'Post-Release Maintenance + Issue Triage Mode','passed':passed,'failed':len(checks)-passed,'checks':checks,'version_lock':lock,'stable_release':stable,'production':production,'patch_plan':plan,'safety':{'pushes_to_github':False,'publishes_release':False,'modifies_github_issues':False,'deletes_files':False,'bypasses_approvals':False}}
def render_maintenance_report():
 s=generate_maintenance_snapshot();return f"# O.R.I.O.N. v6.1 Post-Release Maintenance Report\n\nStatus: {s['status']}\nOpen issues: {s['patch_plan']['open_count']}\nSafety: local triage only; no GitHub issue modification, push, publish, deletion, or approval bypass.\n"
def save_maintenance_report():
 r=render_maintenance_report();p=OUT/f'MAINTENANCE_REPORT_{datetime.now():%Y%m%d_%H%M%S}.md';p.write_text(r);return {'status':'saved','generated_at':now(),'path':str(p),'report':r}
