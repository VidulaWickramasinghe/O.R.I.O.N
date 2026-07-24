import json
from datetime import datetime
from pathlib import Path
from core.final_launch import generate_final_launch_checklist, load_final_launch_freeze_state
from core.github_polish import generate_github_polish_checklist
from core.release_verification import generate_release_verification_snapshot
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'backend/data/github_launch'; GH=ROOT/'.github'; ISSUES=GH/'ISSUE_TEMPLATE'
for p in (OUT,ISSUES):p.mkdir(parents=True,exist_ok=True)
def now():return datetime.now().isoformat(timespec='seconds')
def stamp():return datetime.now().strftime('%Y%m%d_%H%M%S')
def generate_readme_badges():return '![Version](https://img.shields.io/badge/version-v5.6-cyan)\n![Safety](https://img.shields.io/badge/safety-approval--gated-blue)\n![License](https://img.shields.io/badge/license-see--LICENSE-lightgrey)\n'
def generate_release_draft():return '# O.R.I.O.N. v5.6 — GitHub Launch Assistant + Release Draft Prep\n\n## Safety\n\nThis draft does not push, publish, delete, expose secrets, or bypass approvals.\n'
def generate_safe_push_checklist():return '# O.R.I.O.N. Safe Push Checklist\n\n- [ ] Run tests and quality gate\n- [ ] Confirm `.env` and local databases are not staged\n- [ ] Review staged files and screenshots\n- [ ] Push only after manual review\n'
def write_github_templates():
 files={'bug_report':ISSUES/'bug_report.md','feature_request':ISSUES/'feature_request.md','pull_request_template':GH/'pull_request_template.md'}
 files['bug_report'].write_text('---\nname: Bug report\n---\n\nDo not include API keys, tokens, `.env` contents, or private data.\n');files['feature_request'].write_text('---\nname: Feature request\n---\n\n## Safety Considerations\n');files['pull_request_template'].write_text('# Pull Request\n\n## Safety Checklist\n- [ ] Does not expose secrets\n- [ ] Does not bypass approvals\n')
 return {k:str(v) for k,v in files.items()}
def generate_github_launch_checklist():
 final=generate_final_launch_checklist(); verify=generate_release_verification_snapshot(); freeze=load_final_launch_freeze_state(); checks=[{'name':'Final launch freeze is active','ok':bool(freeze['frozen']),'details':f"Frozen: {freeze['frozen']}"},{'name':'Final launch checklist acceptable','ok':final['failed']<=1,'details':f"Failed: {final['failed']}"},{'name':'Release verification available','ok':verify['status'] in ['passed','needs_attention'],'details':verify['status']},{'name':'README exists','ok':(ROOT/'README.md').exists(),'details':'README.md'},{'name':'LICENSE exists','ok':(ROOT/'LICENSE').exists(),'details':'LICENSE'},{'name':'Pull request template ready','ok':(GH/'pull_request_template.md').exists(),'details':'.github/pull_request_template.md'}];passed=sum(c['ok'] for c in checks);return {'status':'github_ready' if passed==len(checks) else 'review_needed','generated_at':now(),'passed':passed,'failed':len(checks)-passed,'checks':checks,'description':'Local-first, approval-gated AI dashboard.','topics':['ai','local-first','aurora-os','safety'],'badges':generate_readme_badges(),'release_draft':generate_release_draft(),'safe_push_checklist':generate_safe_push_checklist()}
def render_github_launch_report():
 c=generate_github_launch_checklist();lines='\n'.join(f"- [{'x' if x['ok'] else ' '}] {x['name']} — {x['details']}" for x in c['checks']);return f"# O.R.I.O.N. v5.6 GitHub Launch Assistant Report\n\nStatus: {c['status']}\n\n{lines}\n\nSafety: no push, publishing, deletion, secret exposure, or approval bypass.\n"
def save_github_launch_artifacts(write_templates=True):
 t=stamp();art={'github_launch_report':OUT/f'GITHUB_LAUNCH_REPORT_{t}.md','release_draft':OUT/f'GITHUB_RELEASE_DRAFT_{t}.md','safe_push_checklist':OUT/f'SAFE_PUSH_CHECKLIST_{t}.md','readme_badges':OUT/f'README_BADGES_{t}.md'};art['github_launch_report'].write_text(render_github_launch_report());art['release_draft'].write_text(generate_release_draft());art['safe_push_checklist'].write_text(generate_safe_push_checklist());art['readme_badges'].write_text(generate_readme_badges());c=generate_github_launch_checklist();result={**c,'artifacts':{k:str(v) for k,v in art.items()},'templates':write_github_templates() if write_templates else {},'safety':{'pushes_to_github':False,'publishes_release':False,'deletes_files':False,'bypasses_approvals':False}};path=OUT/f'GITHUB_LAUNCH_SUMMARY_{t}.json';path.write_text(json.dumps(result,indent=2));return {**result,'summary_path':str(path),'report':render_github_launch_report()}
