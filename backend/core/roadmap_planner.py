"""Local-only future-feature registry and release roadmap governance."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

from core.patch_release import load_patch_state
from core.post_release_maintenance import load_known_issues
from core.stable_release import load_version_lock

ROADMAP_DIR = Path(__file__).resolve().parents[1] / "data" / "roadmap_planner"
ROADMAP_FILE = ROADMAP_DIR / "future_features.json"
DEFAULT_ROADMAP: Dict[str, Any] = {"features": [], "updated_at": ""}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def load_future_features() -> Dict[str, Any]:
    if not ROADMAP_FILE.exists():
        return save_future_features(DEFAULT_ROADMAP.copy())
    try:
        data = json.loads(ROADMAP_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return DEFAULT_ROADMAP.copy()
    return {**DEFAULT_ROADMAP, **data}


def save_future_features(data: Dict[str, Any]) -> Dict[str, Any]:
    ROADMAP_DIR.mkdir(parents=True, exist_ok=True)
    saved = {**DEFAULT_ROADMAP, **data, "updated_at": _now()}
    ROADMAP_FILE.write_text(json.dumps(saved, indent=2), encoding="utf-8")
    return saved


def classify_feature_request(title: str, description: str = "") -> Dict[str, Any]:
    text = f"{title} {description}".lower()
    rules = [
        (("security", "secure", "permission", "approval", "secret", "token", "privacy", "encrypted"), "security", "high", "medium", "safety_review", 90, "Requires safety review before implementation."),
        (("desktop", "file", "terminal", "command", "automation", "execute"), "agentic_tools", "high", "high", "safety_review", 85, "Tool execution features must remain approval-gated."),
        (("bug", "fix", "broken", "error"), "bugfix", "medium", "medium", "patch_release", 80, "Prioritize if reproducible and user-facing."),
        (("memory", "database", "vector", "context"), "memory", "medium", "high", "minor_release", 75, "Requires data handling review and storage safety."),
        (("voice", "wake", "audio", "speech"), "voice", "medium", "high", "minor_release", 70, "Requires local device testing and clear privacy behavior."),
        (("ui", "layout", "mobile", "responsive", "dashboard", "panel"), "frontend", "low", "medium", "minor_release", 65, "Verify mobile and desktop layouts."),
        (("docs", "readme", "guide", "tutorial", "documentation"), "documentation", "low", "low", "patch_release", 55, "Good candidate for a maintenance patch."),
    ]
    category, safety, effort, bucket, score = "general", "low", "medium", "future", 50
    note = "Review manually before adding to a release plan."
    for words, category, safety, effort, bucket, score, note in rules:
        if any(word in text for word in words):
            break
    else:
        category, safety, effort, bucket, score = "general", "low", "medium", "future", 50
        note = "Review manually before adding to a release plan."
    return {"category": category, "safety_level": safety, "effort": effort, "release_bucket": bucket, "priority_score": score, "governance_note": note, "classified_at": _now()}


def add_future_feature(title: str, description: str = "", source: str = "manual") -> Dict[str, Any]:
    if not title.strip():
        raise ValueError("Feature title is required.")
    roadmap, classification = load_future_features(), classify_feature_request(title, description)
    feature = {"id": f"feature_{_timestamp()}_{uuid4().hex[:8]}", "title": title.strip(), "description": description.strip(), "source": source, "status": "proposed", **{key: classification[key] for key in ("category", "safety_level", "effort", "release_bucket", "priority_score", "governance_note")}, "created_at": _now(), "updated_at": _now()}
    roadmap.setdefault("features", []).append(feature)
    save_future_features(roadmap)
    return feature


def generate_roadmap_plan() -> Dict[str, Any]:
    features: List[Dict[str, Any]] = load_future_features().get("features", [])
    proposed = [item for item in features if item.get("status") == "proposed"]
    buckets = {name: [item for item in proposed if item.get("release_bucket") == name] for name in ("patch_release", "minor_release", "safety_review", "future")}
    next_release = "v6.5-safety-review" if buckets["safety_review"] else "v6.5" if buckets["minor_release"] else "v6.0.1" if buckets["patch_release"] else "future_backlog" if buckets["future"] else "no_release_planned"
    return {"status": "roadmap_ready" if proposed else "empty_roadmap", "generated_at": _now(), "total_features": len(features), "proposed_count": len(proposed), "patch_count": len(buckets["patch_release"]), "minor_count": len(buckets["minor_release"]), "safety_review_count": len(buckets["safety_review"]), "future_count": len(buckets["future"]), "high_safety_count": sum(item.get("safety_level") == "high" for item in proposed), "medium_safety_count": sum(item.get("safety_level") == "medium" for item in proposed), "low_safety_count": sum(item.get("safety_level") == "low" for item in proposed), "next_recommended_release": next_release, "features": sorted(proposed, key=lambda item: item.get("priority_score", 0), reverse=True), "release_buckets": buckets}


def generate_governance_checklist() -> Dict[str, Any]:
    plan, lock, patch, issues = generate_roadmap_plan(), load_version_lock(), load_patch_state(), load_known_issues()
    checks = [
        {"name": "Stable version lock available", "ok": "locked" in lock, "details": f"Locked: {lock.get('locked')}"},
        {"name": "Roadmap registry available", "ok": ROADMAP_FILE.exists(), "details": str(ROADMAP_FILE)},
        {"name": "Safety review items identified", "ok": True, "details": f"Items: {plan['safety_review_count']}"},
        {"name": "Patch state available", "ok": "patch_version" in patch, "details": f"Patch: {patch.get('patch_version')}"},
        {"name": "Known issues tracker available", "ok": "issues" in issues, "details": f"Issues: {len(issues.get('issues', []))}"},
    ]
    passed = sum(check["ok"] for check in checks)
    status = "safety_review_needed" if plan["safety_review_count"] else "roadmap_ready" if plan["proposed_count"] else "empty_roadmap"
    return {"status": status, "generated_at": _now(), "release_version": "v6.4", "release_name": "Roadmap Planner + Future Feature Governance", "passed": passed, "failed": len(checks)-passed, "checks": checks, "roadmap_plan": plan, "version_lock": lock, "safety": {"implements_features": False, "pushes_to_github": False, "publishes_release": False, "modifies_github_issues": False, "deletes_files": False, "bypasses_approvals": False}}


def render_roadmap_report() -> str:
    result = generate_governance_checklist(); plan = result["roadmap_plan"]
    checks = "\n".join(f"- [{'x' if item['ok'] else ' '}] {item['name']} — {item['details']}" for item in result["checks"])
    features = "\n".join(f"- [{item['priority_score']}] {item['title']} — {item['category']} / {item['release_bucket']} / safety: {item['safety_level']}" for item in plan["features"]) or "None"
    return f"# O.R.I.O.N. v6.4 Roadmap Planner Report\n\nGenerated: {result['generated_at']}\nStatus: {result['status']}\n\n## Governance Checks\n\n{checks}\n\n## Roadmap Summary\n\n- Proposed: {plan['proposed_count']}\n- Patch: {plan['patch_count']}\n- Minor: {plan['minor_count']}\n- Safety Review: {plan['safety_review_count']}\n- Next Release: {plan['next_recommended_release']}\n\n## Proposed Features\n\n{features}\n\n## Safety\n\nPlanning only; no feature implementation, GitHub mutation, push, publishing, deletion, or approval bypass.\n"


def save_roadmap_report() -> Dict[str, Any]:
    ROADMAP_DIR.mkdir(parents=True, exist_ok=True); report = render_roadmap_report(); path = ROADMAP_DIR / f"ROADMAP_PLANNER_REPORT_{_timestamp()}.md"; path.write_text(report, encoding="utf-8")
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report}


def generate_roadmap_package() -> Dict[str, Any]:
    ROADMAP_DIR.mkdir(parents=True, exist_ok=True); governance = generate_governance_checklist(); plan = governance["roadmap_plan"]; stamp = _timestamp()
    report_path, future_path, summary_path = ROADMAP_DIR/f"ROADMAP_REPORT_{stamp}.md", ROADMAP_DIR/f"FUTURE_RELEASE_PLAN_{stamp}.md", ROADMAP_DIR/f"ROADMAP_SUMMARY_{stamp}.json"
    report_path.write_text(render_roadmap_report(), encoding="utf-8"); future_path.write_text(f"# Future Release Plan\n\nNext recommended release: {plan['next_recommended_release']}\n\nNo feature is implemented automatically.\n", encoding="utf-8")
    summary = {"status": governance["status"], "generated_at": _now(), "release_version": governance["release_version"], "release_name": governance["release_name"], "passed": governance["passed"], "failed": governance["failed"], "next_recommended_release": plan["next_recommended_release"], "report_path": str(report_path), "future_plan_path": str(future_path), "summary_path": str(summary_path), "safety": governance["safety"]}; summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary
