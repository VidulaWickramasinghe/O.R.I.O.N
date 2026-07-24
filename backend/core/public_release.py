"""Local-only public portfolio release asset generation."""
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
PROJECT_ROOT=Path(__file__).resolve().parents[2]; OUT=PROJECT_ROOT/'backend/data/public_release'; OUT.mkdir(parents=True,exist_ok=True)
def _now(): return datetime.now().isoformat(timespec='seconds')
def _stamp(): return datetime.now().strftime('%Y%m%d_%H%M%S')
def _write(name,body): p=OUT/name;p.write_text(body,encoding='utf-8');return str(p)
def _docs(): return {'public_readme':'# O.R.I.O.N.\n\nThink. Plan. Act. Learn.\n\nLocal-first, approval-gated AI dashboard.\n','demo_script':'# O.R.I.O.N. v5.0 Demo Script\n\nShow Dashboard Intelligence, Security View, Tool Audit, Release Candidate, Quality Gate, and Public Release.\n','known_limitations':'# Known Limitations\n\nLocal-first prototype; no production auth or automated publishing.\n','architecture_summary':'# Architecture Summary\n\nAurora OS frontend → API service layer → FastAPI → approval-gated tools and local storage.\n','screenshot_checklist':'# Screenshot Checklist\n\n- Aurora OS dashboard\n- Security View\n- Release View\n- Quality Gate\n- Public Release\n','github_release_notes':'# O.R.I.O.N. v5.0 Release Notes\n\nLocal-only public portfolio assets; no automatic publishing.\n'}
def generate_public_release_package()->Dict[str,Any]:
    stamp=_stamp(); artifacts={key:_write(f'{key.upper()}_{stamp}.md',body) for key,body in _docs().items()}; summary={'status':'generated','version':'v5.0','name':'Public Portfolio Release + Demo Package','generated_at':_now(),'artifact_count':len(artifacts),'artifacts':artifacts,'safety':{'local_only':True,'pushes_to_github':False,'publishes_release':False,'bypasses_approvals':False}}; summary['summary_path']=_write(f'PUBLIC_RELEASE_SUMMARY_{stamp}.json',json.dumps(summary,indent=2));return summary
def render_public_release_report()->str:
    p=generate_public_release_package();return f"# O.R.I.O.N. v5.0 Public Release Report\n\nGenerated: {p['generated_at']}\nArtifacts: {p['artifact_count']}\nSafety: local-only; no push, publish, deletion, or approval bypass.\n"
