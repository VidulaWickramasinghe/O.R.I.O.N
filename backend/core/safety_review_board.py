"""Local safety reviews for proposed roadmap features."""
from __future__ import annotations
import json, os, tempfile, threading, uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
from core.roadmap_planner import generate_roadmap_plan, load_future_features

ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'backend/data/safety_review_board';REVIEW_FILE=OUT/'feature_reviews.json';DEFAULT={'reviews':[],'updated_at':''};_LOCK=threading.RLock();DECISIONS={'approved','conditional_approval','rejected','needs_changes'}
def _now():return datetime.now().isoformat(timespec='seconds')
def _stamp():return datetime.now().strftime('%Y%m%d_%H%M%S_%f')
def _atomic(path:Path,content:str):
 path.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=path.parent,delete=False) as h:h.write(content);temporary=Path(h.name)
 os.replace(temporary,path)
def _text(value:str,name:str,limit:int,required=False):
 value=value.strip()
 if required and not value:raise ValueError(f'{name} is required.')
 if len(value)>limit:raise ValueError(f'{name} must be {limit} characters or fewer.')
 return value
def _normalize_review(v:Any):
 if not isinstance(v,dict) or v.get('decision') not in DECISIONS:return None
 try:score=max(0,min(100,int(v.get('risk_score',0))))
 except (TypeError,ValueError):score=0
 controls=[str(x)[:200] for x in v.get('required_controls',[]) if isinstance(x,str)][:20]
 decision=v['decision'];return {'id':str(v.get('id',''))[:80],'feature_id':str(v.get('feature_id',''))[:80],'feature_title':str(v.get('feature_title',''))[:200],'reviewer':str(v.get('reviewer',''))[:120],'decision':decision,'recommended_decision':v.get('recommended_decision') if v.get('recommended_decision') in DECISIONS else decision,'risk_score':score,'risk_level':v.get('risk_level') if v.get('risk_level') in {'low','medium','high','critical'} else 'low','risk_factors':[str(x)[:200] for x in v.get('risk_factors',[]) if isinstance(x,str)][:20],'required_controls':controls,'notes':str(v.get('notes',''))[:5000],'development_eligible':decision in {'approved','conditional_approval'},'created_at':str(v.get('created_at',''))[:32],'updated_at':str(v.get('updated_at',''))[:32]}
def load_feature_reviews():
 try:raw=json.loads(REVIEW_FILE.read_text(encoding='utf-8'))
 except (OSError,json.JSONDecodeError):return {'reviews':[],'updated_at':''}
 if not isinstance(raw,dict):return {'reviews':[],'updated_at':''}
 return {'reviews':[x for x in (_normalize_review(v) for v in raw.get('reviews',[])) if x],'updated_at':str(raw.get('updated_at',''))[:32]}
def save_feature_reviews(data):
 normalized={'reviews':[x for x in (_normalize_review(v) for v in data.get('reviews',[])) if x],'updated_at':_now()};_atomic(REVIEW_FILE,json.dumps(normalized,indent=2,sort_keys=True));return normalized
def calculate_risk_score(feature:Dict[str,Any]):
 score={'high':40,'medium':25,'low':10}.get(feature.get('safety_level'),10);factors=[f"{feature.get('safety_level','low').title()} safety level"];category=feature.get('category','general');text=f"{feature.get('title','')} {feature.get('description','')}".casefold()
 if category in {'security','agentic_tools'}:score+=30;factors.append(f'Sensitive category: {category}')
 if category in {'memory','voice'}:score+=20;factors.append(f'Data/device-sensitive category: {category}')
 groups=[(('delete','terminal','execute','command','file','desktop'),25,'Touches local execution or files'),(('secret','token','api key','privacy','credential'),35,'Touches secrets or privacy'),(('cloud','sync','remote','upload'),20,'Touches remote/cloud behavior')]
 for words,weight,note in groups:
  if any(word in text for word in words):score+=weight;factors.append(note)
 score=min(score,100);level='critical' if score>=80 else 'high' if score>=60 else 'medium' if score>=35 else 'low';return {'risk_score':score,'risk_level':level,'risk_factors':factors}
def recommend_review_decision(feature):
 risk=calculate_risk_score(feature);level=risk['risk_level']
 if level=='critical':decision='needs_changes';controls=['Explicit user approval','Audit logging','Permission gating','Rollback plan','Secret/privacy review','Manual test plan']
 elif level=='high':decision='conditional_approval';controls=['Explicit user approval','Audit logging','Permission gating','Manual test plan']
 elif level=='medium':decision='conditional_approval';controls=['Manual test plan','Clear user-facing behavior','No approval bypass']
 else:decision='approved';controls=['Standard testing','Documentation for user-facing behavior']
 return {**risk,'recommended_decision':decision,'required_controls':controls}
def create_feature_review(feature_id,reviewer='O.R.I.O.N. Safety Review Board',decision='auto_recommend',notes=''):
 feature_id=_text(feature_id,'Feature ID',80,True);reviewer=_text(reviewer,'Reviewer',120,True);notes=_text(notes,'Notes',5000);features=load_future_features()['features'];feature=next((x for x in features if x['id']==feature_id),None)
 if not feature:raise ValueError(f'Feature not found: {feature_id}')
 recommendation=recommend_review_decision(feature);final=recommendation['recommended_decision'] if decision=='auto_recommend' else decision
 if final not in DECISIONS:raise ValueError('Decision must be auto_recommend, approved, conditional_approval, rejected, or needs_changes.')
 if recommendation['risk_level']=='critical' and final in {'approved','conditional_approval'}:raise ValueError('Critical-risk features cannot be approved without design changes and a new review.')
 now=_now();review={'id':f'review_{uuid.uuid4().hex}','feature_id':feature_id,'feature_title':feature['title'],'reviewer':reviewer,'decision':final,'recommended_decision':recommendation['recommended_decision'],'risk_score':recommendation['risk_score'],'risk_level':recommendation['risk_level'],'risk_factors':recommendation['risk_factors'],'required_controls':recommendation['required_controls'],'notes':notes,'development_eligible':final in {'approved','conditional_approval'},'created_at':now,'updated_at':now}
 with _LOCK:data=load_feature_reviews();data['reviews'].append(review);save_feature_reviews(data)
 return review
def _latest_reviews(reviews):
 latest={}
 for review in reviews:latest[review['feature_id']]=review
 return list(latest.values())
def generate_safety_review_snapshot():
 plan=generate_roadmap_plan();all_reviews=load_feature_reviews()['reviews'];reviews=_latest_reviews(all_reviews);reviewed={x['feature_id'] for x in reviews};pending=[x for x in plan['features'] if x['id'] not in reviewed];safety_pending=[x for x in pending if x['release_bucket']=='safety_review' or x['safety_level'] in {'high','medium'}];approved=[x for x in reviews if x['decision'] in {'approved','conditional_approval'}];rejected=[x for x in reviews if x['decision']=='rejected'];changes=[x for x in reviews if x['decision']=='needs_changes'];critical=[x for x in reviews if x['risk_level']=='critical'];checks=[{'name':'Review data valid','ok':True,'details':f'Latest reviews: {len(reviews)}'},{'name':'Pending safety reviews identified','ok':True,'details':f'Pending: {len(safety_pending)}'},{'name':'Critical reviews include controls','ok':all(x['required_controls'] and not x['development_eligible'] for x in critical),'details':f'Critical: {len(critical)}'},{'name':'Development eligibility explicit','ok':all(isinstance(x['development_eligible'],bool) for x in reviews),'details':f'Reviews: {len(reviews)}'}];passed=sum(x['ok'] for x in checks);status='reviews_pending' if safety_pending else 'changes_required' if changes else 'some_rejected' if rejected else 'review_board_clear';return {'status':status,'generated_at':_now(),'release_version':'v6.5','release_name':'Safety Review Board + Feature Approval Workflow','passed':passed,'failed':len(checks)-passed,'checks':checks,'roadmap_plan':plan,'reviews':reviews,'review_history_count':len(all_reviews),'pending_features':pending,'safety_review_features':safety_pending,'approved_count':len(approved),'rejected_count':len(rejected),'needs_changes_count':len(changes),'pending_count':len(pending),'safety_review_pending_count':len(safety_pending),'safety':{'implements_features':False,'pushes_to_github':False,'publishes_release':False,'modifies_github_issues':False,'approves_development_only':True,'bypasses_approvals':False}}
def render_safety_review_report(snapshot=None):
 snapshot=snapshot or generate_safety_review_snapshot();lines='\n'.join(f"- [{x['decision']}] {x['feature_title']} — risk {x['risk_level']} ({x['risk_score']})" for x in snapshot['reviews']) or 'None';return f"# O.R.I.O.N. v6.5 Safety Review Board Report\n\nGenerated: {snapshot['generated_at']}\nStatus: {snapshot['status']}\nPending: {snapshot['safety_review_pending_count']}\nApproved: {snapshot['approved_count']}\nNeeds changes: {snapshot['needs_changes_count']}\n\n## Latest Decisions\n\n{lines}\n\n## Safety\n\nRecords local decisions only; no implementation, GitHub changes, publishing, or approval bypass.\n"
def save_safety_review_report():
 snapshot=generate_safety_review_snapshot();report=render_safety_review_report(snapshot);path=OUT/f'SAFETY_REVIEW_BOARD_REPORT_{_stamp()}.md';_atomic(path,report);return {'status':'saved','generated_at':_now(),'path':str(path),'report':report,'snapshot':snapshot}
def generate_safety_review_package():
 snapshot=generate_safety_review_snapshot();report=render_safety_review_report(snapshot);stamp=_stamp();report_path=OUT/f'SAFETY_REVIEW_REPORT_{stamp}.md';plan_path=OUT/f'FEATURE_APPROVAL_PLAN_{stamp}.md';summary_path=OUT/f'SAFETY_REVIEW_SUMMARY_{stamp}.json';lines='\n'.join(f"- {x['feature_title']} — {x['decision']} — eligible: {x['development_eligible']}" for x in snapshot['reviews']) or 'No reviewed features.';plan=f'# Feature Approval Plan\n\n{lines}\n\nOnly eligible features may enter manual development planning.\n';summary={k:snapshot[k] for k in ('status','generated_at','release_version','release_name','passed','failed','approved_count','rejected_count','needs_changes_count','pending_count','safety_review_pending_count','safety')};summary.update({'report_path':str(report_path),'approval_plan_path':str(plan_path),'summary_path':str(summary_path)});_atomic(report_path,report);_atomic(plan_path,plan);_atomic(summary_path,json.dumps(summary,indent=2,sort_keys=True));return summary
