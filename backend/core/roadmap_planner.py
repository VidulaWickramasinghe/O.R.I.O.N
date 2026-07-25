"""Local-only feature roadmap planning and governance."""
from __future__ import annotations
import json, os, tempfile, threading, uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
from core.post_release_maintenance import load_known_issues
from core.patch_release import load_patch_state
from core.stable_release import load_version_lock

ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'backend/data/roadmap_planner'; ROADMAP_FILE=OUT/'future_features.json'; _LOCK=threading.RLock(); DEFAULT={'features':[],'updated_at':''}; BUCKETS={'patch_release','minor_release','safety_review','future'}; SAFETY={'low','medium','high'}
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
def _normalize_feature(value:Any):
 if not isinstance(value,dict) or not str(value.get('title','')).strip(): return None
 safety=value.get('safety_level') if value.get('safety_level') in SAFETY else 'low'; bucket=value.get('release_bucket') if value.get('release_bucket') in BUCKETS else 'future'
 try: score=max(0,min(100,int(value.get('priority_score',50))))
 except (TypeError,ValueError): score=50
 return {'id':str(value.get('id',''))[:80], 'title':str(value['title']).strip()[:200], 'description':str(value.get('description',''))[:5000], 'source':str(value.get('source','manual'))[:40], 'status':value.get('status') if value.get('status') in {'proposed','approved','rejected','delivered'} else 'proposed', 'category':str(value.get('category','general'))[:40], 'safety_level':safety, 'effort':value.get('effort') if value.get('effort') in {'low','medium','high'} else 'medium', 'release_bucket':bucket, 'priority_score':score, 'governance_note':str(value.get('governance_note','Review manually.'))[:500], 'created_at':str(value.get('created_at',''))[:32], 'updated_at':str(value.get('updated_at',''))[:32]}
def load_future_features():
 try: raw=json.loads(ROADMAP_FILE.read_text(encoding='utf-8'))
 except (OSError,json.JSONDecodeError): return {'features':[],'updated_at':''}
 if not isinstance(raw,dict): return {'features':[],'updated_at':''}
 return {'features':[x for x in (_normalize_feature(v) for v in raw.get('features',[])) if x], 'updated_at':str(raw.get('updated_at',''))[:32]}
def save_future_features(data):
 normalized={'features':[x for x in (_normalize_feature(v) for v in data.get('features',[])) if x], 'updated_at':_now()}; _atomic(ROADMAP_FILE,json.dumps(normalized,indent=2,sort_keys=True)); return normalized
def classify_feature_request(title,description=''):
 title=_text(title,'Title',200,True); description=_text(description,'Description',5000); text=f'{title} {description}'.casefold()
 rules=[('security','high','medium','safety_review',90,('security','permission','approval','secret','token','privacy'),'Requires safety review before implementation.'),('agentic_tools','high','high','safety_review',85,('desktop','file','terminal','command','automation','execute'),'Execution features must remain approval-gated.'),('memory','medium','high','minor_release',75,('memory','database','vector','context','sync','cloud'),'Requires data handling, privacy, and storage review.'),('voice','medium','high','minor_release',70,('voice','wake','audio','speech'),'Requires device testing and clear privacy behavior.'),('bugfix','medium','medium','patch_release',80,('bug','fix','broken','error'),'Prioritize when reproducible and user-facing.'),('frontend','low','medium','minor_release',65,('ui','layout','mobile','responsive','dashboard','panel'),'Verify desktop and mobile layouts.'),('documentation','low','low','patch_release',55,('docs','readme','guide','tutorial','documentation'),'Candidate for a reviewed patch release.')]
 category,safety,effort,bucket,score,note='general','low','medium','future',50,'Review manually before release planning.'
 for c,s,e,b,p,words,n in rules:
  if any(word in text for word in words): category,safety,effort,bucket,score,note=c,s,e,b,p,n; break
 return {'category':category,'safety_level':safety,'effort':effort,'release_bucket':bucket,'priority_score':score,'governance_note':note,'classified_at':_now()}
def add_future_feature(title,description='',source='manual'):
 source=_text(source,'Source',40,True); description=_text(description,'Description',5000); classification=classify_feature_request(title,description); now=_now(); feature={'id':f'feature_{uuid.uuid4().hex}','title':_text(title,'Title',200,True),'description':description,'source':source,'status':'proposed',**classification,'created_at':now,'updated_at':now}; feature.pop('classified_at',None)
 with _LOCK:
  data=load_future_features(); data['features'].append(feature); save_future_features(data)
 return feature
def generate_roadmap_plan(data=None):
 features=(data or load_future_features())['features']; proposed=[x.copy() for x in features if x['status']=='proposed']; buckets={b:[x for x in proposed if x['release_bucket']==b] for b in BUCKETS}; proposed.sort(key=lambda x:(-x['priority_score'],x['created_at'],x['id']))
 next_release='v6.5-safety-review' if buckets['safety_review'] else 'v6.5' if buckets['minor_release'] else 'v6.2.1' if buckets['patch_release'] else 'future_backlog' if buckets['future'] else 'no_release_planned'
 return {'status':'roadmap_ready' if proposed else 'empty_roadmap','generated_at':_now(),'total_features':len(features),'proposed_count':len(proposed),'patch_count':len(buckets['patch_release']),'minor_count':len(buckets['minor_release']),'safety_review_count':len(buckets['safety_review']),'future_count':len(buckets['future']),'high_safety_count':sum(x['safety_level']=='high' for x in proposed),'medium_safety_count':sum(x['safety_level']=='medium' for x in proposed),'low_safety_count':sum(x['safety_level']=='low' for x in proposed),'next_recommended_release':next_release,'features':proposed,'release_buckets':buckets}
def generate_governance_checklist():
 plan=generate_roadmap_plan(); lock=load_version_lock(); patch=load_patch_state(); issues=load_known_issues(); raw=[('Stable version lock active',lock.get('locked') is True,f"Locked: {lock.get('locked')}"),('Roadmap data valid',True,f"Features: {plan['total_features']}"),('Safety-sensitive features identified',all(x['release_bucket']=='safety_review' for x in plan['features'] if x['safety_level']=='high'),f"Safety review: {plan['safety_review_count']}"),('Patch state valid',str(patch.get('patch_version','')).startswith('v6.2.'),f"Patch: {patch.get('patch_version')}"),('Known issue registry valid',isinstance(issues.get('issues'),list),f"Issues: {len(issues.get('issues',[]))}")];checks=[{'name':n,'ok':bool(ok),'details':d} for n,ok,d in raw];passed=sum(x['ok'] for x in checks);status='safety_review_needed' if plan['safety_review_count'] else plan['status'];return {'status':status,'generated_at':_now(),'release_version':'v6.4','release_name':'Roadmap Planner + Future Feature Governance','passed':passed,'failed':len(checks)-passed,'checks':checks,'roadmap_plan':plan,'version_lock':lock,'safety':{'implements_features':False,'pushes_to_github':False,'publishes_release':False,'modifies_github_issues':False,'deletes_files':False,'bypasses_approvals':False}}
def render_roadmap_report(governance=None):
 governance=governance or generate_governance_checklist();plan=governance['roadmap_plan'];lines='\n'.join(f"- [{x['priority_score']}] {x['title']} — {x['category']} / {x['release_bucket']} / safety: {x['safety_level']}" for x in plan['features']) or 'None';return f"# O.R.I.O.N. v6.4 Roadmap Planner Report\n\nGenerated: {governance['generated_at']}\nStatus: {governance['status']}\nNext release: {plan['next_recommended_release']}\n\n## Proposed Features\n\n{lines}\n\n## Safety\n\nPlanning only; no implementation, GitHub changes, publishing, deletion, or approval bypass.\n"
def save_roadmap_report():
 governance=generate_governance_checklist();report=render_roadmap_report(governance);path=OUT/f'ROADMAP_PLANNER_REPORT_{_stamp()}.md';_atomic(path,report);return {'status':'saved','generated_at':_now(),'path':str(path),'report':report,'governance':governance}
def generate_roadmap_package():
 governance=generate_governance_checklist();report=render_roadmap_report(governance);stamp=_stamp();report_path=OUT/f'ROADMAP_REPORT_{stamp}.md';plan_path=OUT/f'FUTURE_RELEASE_PLAN_{stamp}.md';summary_path=OUT/f'ROADMAP_SUMMARY_{stamp}.json';plan=governance['roadmap_plan'];future=f"# Future Release Plan\n\nNext recommended release: {plan['next_recommended_release']}\n\nSafety review items: {plan['safety_review_count']}\nNo feature is implemented automatically.\n";summary={'status':governance['status'],'generated_at':_now(),'release_version':'v6.4','release_name':governance['release_name'],'passed':governance['passed'],'failed':governance['failed'],'next_recommended_release':plan['next_recommended_release'],'report_path':str(report_path),'future_plan_path':str(plan_path),'summary_path':str(summary_path),'safety':governance['safety']};_atomic(report_path,report);_atomic(plan_path,future);_atomic(summary_path,json.dumps(summary,indent=2,sort_keys=True));return summary
