"""Local feature-risk review and development-eligibility governance."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

from core.roadmap_planner import generate_roadmap_plan, load_future_features

SAFETY_REVIEW_DIR = Path(__file__).resolve().parents[1] / "data" / "safety_review_board"
REVIEW_FILE = SAFETY_REVIEW_DIR / "feature_reviews.json"
DEFAULT_REVIEWS: Dict[str, Any] = {"reviews": [], "updated_at": ""}
VALID_DECISIONS = {"auto_recommend", "approved", "conditional_approval", "needs_changes", "rejected"}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def load_feature_reviews() -> Dict[str, Any]:
    if not REVIEW_FILE.exists():
        return save_feature_reviews(DEFAULT_REVIEWS.copy())
    try:
        data = json.loads(REVIEW_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return DEFAULT_REVIEWS.copy()
    return {**DEFAULT_REVIEWS, **data}


def save_feature_reviews(data: Dict[str, Any]) -> Dict[str, Any]:
    SAFETY_REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    saved = {**DEFAULT_REVIEWS, **data, "updated_at": _now()}
    REVIEW_FILE.write_text(json.dumps(saved, indent=2), encoding="utf-8")
    return saved


def calculate_risk_score(feature: Dict[str, Any]) -> Dict[str, Any]:
    score, factors = 0, []
    safety, category = feature.get("safety_level", "low"), feature.get("category", "general")
    text = f"{feature.get('title', '')} {feature.get('description', '')}".lower()
    base = {"high": 40, "medium": 25, "low": 10}.get(safety, 10)
    score += base; factors.append(f"{safety.title()} safety level")
    if category in {"security", "agentic_tools"}: score += 30; factors.append(f"Sensitive category: {category}")
    if category in {"memory", "voice"}: score += 20; factors.append(f"Data/device-sensitive category: {category}")
    rules = [(("delete", "terminal", "execute", "command", "file", "desktop"), 25, "Touches execution or file/desktop operations"), (("secret", "token", "api key", "privacy", "credential"), 35, "Touches secrets, credentials, or privacy"), (("cloud", "sync", "remote", "upload"), 20, "Touches remote/cloud behavior")]
    for words, points, label in rules:
        if any(word in text for word in words): score += points; factors.append(label)
    score = min(score, 100)
    level = "critical" if score >= 80 else "high" if score >= 60 else "medium" if score >= 35 else "low"
    return {"risk_score": score, "risk_level": level, "risk_factors": factors}


def recommend_review_decision(feature: Dict[str, Any]) -> Dict[str, Any]:
    risk = calculate_risk_score(feature)
    controls = {"critical": ["Explicit user approval", "Audit logging", "Permission gating", "Rollback plan", "Secret/privacy review", "Manual test plan"], "high": ["Explicit user approval", "Audit logging", "Permission gating", "Manual test plan"], "medium": ["Manual test plan", "Clear user-facing behavior", "No approval bypass"], "low": ["Standard testing", "Documentation update if user-facing"]}
    decision = "needs_changes" if risk["risk_level"] == "critical" else "conditional_approval" if risk["risk_level"] in {"high", "medium"} else "approved"
    return {**risk, "recommended_decision": decision, "required_controls": controls[risk["risk_level"]]}


def create_feature_review(feature_id: str, reviewer: str = "O.R.I.O.N. Safety Review Board", decision: str = "auto_recommend", notes: str = "") -> Dict[str, Any]:
    if decision not in VALID_DECISIONS:
        raise ValueError(f"Invalid review decision: {decision}")
    feature = next((item for item in load_future_features().get("features", []) if item.get("id") == feature_id), None)
    if feature is None:
        raise ValueError(f"Feature not found: {feature_id}")
    recommendation = recommend_review_decision(feature)
    final = recommendation["recommended_decision"] if decision == "auto_recommend" else decision
    if recommendation["risk_level"] == "critical" and final in {"approved", "conditional_approval"}:
        raise ValueError("Critical-risk features cannot be marked development eligible until changes reduce risk.")
    review = {"id": f"review_{_timestamp()}_{uuid4().hex[:8]}", "feature_id": feature_id, "feature_title": feature.get("title"), "reviewer": reviewer.strip() or "O.R.I.O.N. Safety Review Board", "decision": final, "recommended_decision": recommendation["recommended_decision"], "risk_score": recommendation["risk_score"], "risk_level": recommendation["risk_level"], "risk_factors": recommendation["risk_factors"], "required_controls": recommendation["required_controls"], "notes": notes.strip(), "development_eligible": final in {"approved", "conditional_approval"}, "created_at": _now(), "updated_at": _now()}
    data = load_feature_reviews(); data.setdefault("reviews", []).append(review); save_feature_reviews(data)
    return review


def generate_safety_review_snapshot() -> Dict[str, Any]:
    plan, data = generate_roadmap_plan(), load_feature_reviews(); reviews = data.get("reviews", [])
    latest: Dict[str, Dict[str, Any]] = {}
    for review in reviews: latest[review.get("feature_id", "")] = review
    pending = [feature for feature in plan.get("features", []) if feature.get("id") not in latest]
    sensitive = [feature for feature in pending if feature.get("release_bucket") == "safety_review" or feature.get("safety_level") in {"high", "medium"}]
    approved = [review for review in latest.values() if review.get("decision") in {"approved", "conditional_approval"}]
    rejected = [review for review in latest.values() if review.get("decision") == "rejected"]
    changes = [review for review in latest.values() if review.get("decision") == "needs_changes"]
    critical = [review for review in latest.values() if review.get("risk_level") == "critical"]
    checks = [{"name": "Safety review registry exists", "ok": REVIEW_FILE.exists(), "details": str(REVIEW_FILE)}, {"name": "Pending safety reviews identified", "ok": True, "details": f"Pending: {len(sensitive)}"}, {"name": "Critical reviews require controls", "ok": all(review.get("required_controls") and not review.get("development_eligible") for review in critical), "details": f"Critical: {len(critical)}"}, {"name": "Development eligibility explicit", "ok": all("development_eligible" in review for review in reviews), "details": f"Reviews: {len(reviews)}"}]
    passed = sum(check["ok"] for check in checks)
    status = "reviews_pending" if sensitive else "changes_required" if changes else "some_rejected" if rejected else "review_board_clear"
    return {"status": status, "generated_at": _now(), "release_version": "v6.5", "release_name": "Safety Review Board + Feature Approval Workflow", "passed": passed, "failed": len(checks)-passed, "checks": checks, "roadmap_plan": plan, "reviews": reviews, "pending_features": pending, "safety_review_features": sensitive, "approved_count": len(approved), "rejected_count": len(rejected), "needs_changes_count": len(changes), "pending_count": len(pending), "safety_review_pending_count": len(sensitive), "safety": {"implements_features": False, "pushes_to_github": False, "publishes_release": False, "modifies_github_issues": False, "approves_development_only": True, "bypasses_approvals": False}}


def render_safety_review_report() -> str:
    snapshot = generate_safety_review_snapshot(); checks = "\n".join(f"- [{'x' if item['ok'] else ' '}] {item['name']} — {item['details']}" for item in snapshot["checks"]); reviews = "\n".join(f"- [{item['decision']}] {item['feature_title']} — {item['risk_level']} ({item['risk_score']})" for item in snapshot["reviews"]) or "None"
    return f"# O.R.I.O.N. v6.5 Safety Review Board Report\n\nGenerated: {snapshot['generated_at']}\nStatus: {snapshot['status']}\n\n## Summary\n\n- Pending: {snapshot['pending_count']}\n- Approved: {snapshot['approved_count']}\n- Rejected: {snapshot['rejected_count']}\n- Needs Changes: {snapshot['needs_changes_count']}\n\n## Governance Checks\n\n{checks}\n\n## Review Decisions\n\n{reviews}\n\n## Safety\n\nReviews and local decisions only; no feature implementation, push, publishing, GitHub issue mutation, or approval bypass.\n"


def save_safety_review_report() -> Dict[str, Any]:
    SAFETY_REVIEW_DIR.mkdir(parents=True, exist_ok=True); report = render_safety_review_report(); path = SAFETY_REVIEW_DIR/f"SAFETY_REVIEW_BOARD_REPORT_{_timestamp()}.md"; path.write_text(report, encoding="utf-8")
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report}


def generate_safety_review_package() -> Dict[str, Any]:
    SAFETY_REVIEW_DIR.mkdir(parents=True, exist_ok=True); snapshot = generate_safety_review_snapshot(); stamp = _timestamp(); report_path = SAFETY_REVIEW_DIR/f"SAFETY_REVIEW_REPORT_{stamp}.md"; plan_path = SAFETY_REVIEW_DIR/f"FEATURE_APPROVAL_PLAN_{stamp}.md"; summary_path = SAFETY_REVIEW_DIR/f"SAFETY_REVIEW_SUMMARY_{stamp}.json"
    report_path.write_text(render_safety_review_report(), encoding="utf-8"); eligibility = "\n".join(f"- {item['feature_title']} — {item['decision']} — eligible: {item['development_eligible']}" for item in snapshot["reviews"]) or "No reviewed features yet."; plan_path.write_text(f"# Feature Approval Plan\n\n{eligibility}\n\nApproval is governance only and never implements a feature.\n", encoding="utf-8")
    summary = {key: snapshot[key] for key in ("status", "generated_at", "release_version", "release_name", "passed", "failed", "approved_count", "rejected_count", "needs_changes_count", "pending_count", "safety_review_pending_count", "safety")}; summary.update({"report_path": str(report_path), "approval_plan_path": str(plan_path), "summary_path": str(summary_path)}); summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary
