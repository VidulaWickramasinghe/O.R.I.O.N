"""Local-only changelog and release-note draft composition."""
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from core.patch_release import generate_hotfix_checklist, generate_patch_notes, load_patch_state
from core.post_release_maintenance import generate_patch_plan, load_known_issues
from core.stable_release import load_version_lock

OUT = Path(__file__).resolve().parents[1] / "data" / "changelog_intelligence"
def _now(): return datetime.now().isoformat(timespec="seconds")
def _stamp(): return datetime.now().strftime("%Y%m%d_%H%M%S")
def _group(items: List[Dict[str, Any]]):
    result: Dict[str, List[Dict[str, Any]]] = {}
    for item in items: result.setdefault(item.get("category", "general"), []).append(item)
    return result

def generate_changelog_entry():
    state, plan = load_patch_state(), generate_patch_plan()
    sections = []
    for category, items in _group(plan["open_issues"]).items():
        sections.append(f"### {category.title()}\n\n" + "\n".join(f"- {item['title']} — {item['suggested_action']}" for item in items))
    body = "\n\n".join(sections) or "### Maintenance\n\n- No open known issues were selected for this patch."
    return f"## {state['patch_version']} — {state['patch_type'].title()} Patch\n\n### Summary\n\nThis patch release focuses on reviewed post-release maintenance items for O.R.I.O.N.\n\n{body}\n\n### Safety\n\n- Local drafts only; no publishing, issue modification, deletion, or approval bypass.\n"

def generate_github_release_notes():
    state, plan, hotfix = load_patch_state(), generate_patch_plan(), generate_hotfix_checklist()
    issues = "\n".join(f"- **{item['title']}** `{item['priority']}` `{item['category']}`" for item in plan["open_issues"]) or "- No open known issues selected."
    return f"# O.R.I.O.N. {state['patch_version']} Release Notes\n\n## Overview\n\nThis is a **{state['patch_type']}** update composed from local maintenance data.\n\n## Patch Status\n\n- Base Version: {state['base_version']}\n- Workflow Active: {state['active']}\n- Hotfix Status: {hotfix['status']}\n\n## Issues Included\n\n{issues}\n\n## Manual Release Reminder\n\nThis draft does not publish anything. Review all files before manually creating a GitHub release.\n"

def generate_public_update_summary():
    state, plan = load_patch_state(), generate_patch_plan()
    focus = "general post-release stability" if not plan["open_count"] else "critical review items" if plan["critical_count"] else "important bug fixes" if plan["high_count"] else "small maintenance improvements and polish"
    return f"O.R.I.O.N. {state['patch_version']} is a {state['patch_type']} update focused on {focus}. The workflow remains manual and safety-gated, with no automatic GitHub publishing."

def generate_maintenance_communication_pack():
    state, plan, known, lock = load_patch_state(), generate_patch_plan(), load_known_issues(), load_version_lock()
    checks=[{"name":"Patch state available","ok":bool(state.get("patch_version")),"details":f"Patch Version: {state.get('patch_version')}"},{"name":"Known issues tracker available","ok":"issues" in known,"details":f"Issues: {len(known.get('issues',[]))}"},{"name":"Patch plan generated","ok":plan["status"] in {"patch_needed","clean"},"details":f"Status: {plan['status']}"},{"name":"Stable version lock available","ok":"locked" in lock,"details":f"Locked: {lock.get('locked')}"}]
    passed=sum(x["ok"] for x in checks)
    return {"status":"composer_ready" if passed==len(checks) else "review_needed","generated_at":_now(),"release_version":"v6.3","release_name":"Changelog Intelligence + Release Notes Composer","patch_version":state.get("patch_version"),"patch_type":state.get("patch_type"),"passed":passed,"failed":len(checks)-passed,"checks":checks,"patch_plan":plan,"changelog_entry":generate_changelog_entry(),"github_release_notes":generate_github_release_notes(),"public_summary":generate_public_update_summary(),"raw_patch_notes":generate_patch_notes(),"safety":{"pushes_to_github":False,"publishes_release":False,"modifies_github_issues":False,"modifies_github_releases":False,"deletes_files":False,"bypasses_approvals":False}}

def render_changelog_intelligence_report():
    pack=generate_maintenance_communication_pack(); checks="\n".join(f"- [{'x' if x['ok'] else ' '}] {x['name']} — {x['details']}" for x in pack['checks'])
    return f"# O.R.I.O.N. v6.3 Changelog Intelligence Report\n\nGenerated: {pack['generated_at']}\nStatus: {pack['status']}\n\n## Composer Checks\n\n{checks}\n\n## Public Summary\n\n{pack['public_summary']}\n\n## Safety\n\nLocal drafts only: no GitHub push, publishing, release or issue mutation, deletion, or approval bypass.\n"

def save_changelog_intelligence_artifacts():
    OUT.mkdir(parents=True,exist_ok=True); pack=generate_maintenance_communication_pack(); stamp=_stamp()
    paths={"report_path":OUT/f"CHANGELOG_INTELLIGENCE_REPORT_{stamp}.md","changelog_path":OUT/f"CHANGELOG_ENTRY_{stamp}.md","github_notes_path":OUT/f"GITHUB_RELEASE_NOTES_{stamp}.md","public_summary_path":OUT/f"PUBLIC_UPDATE_SUMMARY_{stamp}.md","raw_patch_notes_path":OUT/f"RAW_PATCH_NOTES_{stamp}.md"}
    contents=[render_changelog_intelligence_report(),pack['changelog_entry'],pack['github_release_notes'],pack['public_summary'],pack['raw_patch_notes']]
    for path,content in zip(paths.values(),contents): path.write_text(content,encoding='utf-8')
    summary={**{k:str(v) for k,v in paths.items()},"status":pack['status'],"generated_at":_now(),"release_version":pack['release_version'],"patch_version":pack['patch_version'],"patch_type":pack['patch_type'],"passed":pack['passed'],"failed":pack['failed'],"safety":pack['safety']}; summary['summary_path']=str(OUT/f"CHANGELOG_INTELLIGENCE_SUMMARY_{stamp}.json");Path(summary['summary_path']).write_text(json.dumps(summary,indent=2),encoding='utf-8')
    return {**summary,"report":contents[0],"changelog_entry":pack['changelog_entry'],"github_release_notes":pack['github_release_notes'],"public_summary":pack['public_summary']}
