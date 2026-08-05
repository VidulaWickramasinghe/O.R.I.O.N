"""Local-only feature roadmap planning and governance."""
from __future__ import annotations

import json
import os
import tempfile
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from core.patch_release import load_patch_state
from core.post_release_maintenance import load_known_issues
from core.stable_release import load_version_lock

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "backend/data/roadmap_planner"
ROADMAP_FILE = OUT / "future_features.json"

_LOCK = threading.RLock()

DEFAULT = {"features": [], "updated_at": ""}
BUCKETS = {"patch_release", "minor_release", "safety_review", "future"}
SAFETY = {"low", "medium", "high"}
STATUSES = {"proposed", "approved", "rejected", "delivered"}
EFFORTS = {"low", "medium", "high"}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _atomic(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=path.parent,
        delete=False,
    ) as handle:
        handle.write(content)
        temporary = Path(handle.name)

    os.replace(temporary, path)


def _text(value: str, name: str, limit: int, required: bool = False) -> str:
    value = str(value or "").strip()

    if required and not value:
        raise ValueError(f"{name} is required.")

    if len(value) > limit:
        raise ValueError(f"{name} must be {limit} characters or fewer.")

    return value


def _feature_key(value: Dict[str, Any]) -> str:
    """
    Normalize a roadmap feature title for duplicate detection.

    This intentionally treats case and spacing differences as the same feature:
    - "Add mobile governance dashboard view"
    - "add mobile governance dashboard view"
    - "Add  mobile   governance dashboard view"
    """
    title = str(value.get("title", "") or "")
    return " ".join(title.casefold().strip().split())


def _safety_rank(level: str) -> int:
    return {"low": 0, "medium": 1, "high": 2}.get(level, 0)


def _effort_rank(level: str) -> int:
    return {"low": 0, "medium": 1, "high": 2}.get(level, 1)


def _normalize_feature(value: Any) -> Dict[str, Any] | None:
    if not isinstance(value, dict) or not str(value.get("title", "")).strip():
        return None

    safety = value.get("safety_level") if value.get("safety_level") in SAFETY else "low"
    bucket = value.get("release_bucket") if value.get("release_bucket") in BUCKETS else "future"

    try:
        score = max(0, min(100, int(value.get("priority_score", 50))))
    except (TypeError, ValueError):
        score = 50

    return {
        "id": str(value.get("id", ""))[:80],
        "title": str(value["title"]).strip()[:200],
        "description": str(value.get("description", ""))[:5000],
        "source": str(value.get("source", "manual"))[:40],
        "status": value.get("status") if value.get("status") in STATUSES else "proposed",
        "category": str(value.get("category", "general"))[:40],
        "safety_level": safety,
        "effort": value.get("effort") if value.get("effort") in EFFORTS else "medium",
        "release_bucket": bucket,
        "priority_score": score,
        "governance_note": str(value.get("governance_note", "Review manually."))[:500],
        "created_at": str(value.get("created_at", ""))[:32],
        "updated_at": str(value.get("updated_at", ""))[:32],
    }


def _merge_duplicate_feature(
    existing: Dict[str, Any],
    incoming: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Merge duplicate records without creating another roadmap item.
    Keeps the original ID and oldest created_at, while preserving stronger
    governance/risk metadata when a later duplicate contains it.
    """
    if len(incoming.get("description", "")) > len(existing.get("description", "")):
        existing["description"] = incoming["description"]

    if incoming.get("source") and existing.get("source") == "manual":
        existing["source"] = incoming["source"]

    if _safety_rank(incoming.get("safety_level", "low")) > _safety_rank(existing.get("safety_level", "low")):
        existing["safety_level"] = incoming["safety_level"]

    if _effort_rank(incoming.get("effort", "medium")) > _effort_rank(existing.get("effort", "medium")):
        existing["effort"] = incoming["effort"]

    if int(incoming.get("priority_score", 50)) > int(existing.get("priority_score", 50)):
        existing["priority_score"] = incoming["priority_score"]

    if incoming.get("release_bucket") == "safety_review":
        existing["release_bucket"] = "safety_review"

    if incoming.get("governance_note") and incoming.get("governance_note") != "Review manually.":
        existing["governance_note"] = incoming["governance_note"]

    created_values = [v for v in [existing.get("created_at"), incoming.get("created_at")] if v]
    updated_values = [v for v in [existing.get("updated_at"), incoming.get("updated_at")] if v]

    if created_values:
        existing["created_at"] = min(created_values)

    if updated_values:
        existing["updated_at"] = max(updated_values)

    return existing


def _dedupe_features(values: List[Any]) -> List[Dict[str, Any]]:
    deduped: List[Dict[str, Any]] = []
    seen: Dict[str, Dict[str, Any]] = {}

    for value in values:
        feature = _normalize_feature(value)

        if not feature:
            continue

        key = _feature_key(feature)

        if not key:
            continue

        if key in seen:
            _merge_duplicate_feature(seen[key], feature)
            continue

        deduped.append(feature)
        seen[key] = feature

    return deduped


def load_future_features() -> Dict[str, Any]:
    try:
        raw = json.loads(ROADMAP_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"features": [], "updated_at": ""}

    if not isinstance(raw, dict):
        return {"features": [], "updated_at": ""}

    return {
        "features": _dedupe_features(raw.get("features", [])),
        "updated_at": str(raw.get("updated_at", ""))[:32],
    }


def save_future_features(data: Dict[str, Any]) -> Dict[str, Any]:
    normalized = {
        "features": _dedupe_features(data.get("features", [])),
        "updated_at": _now(),
    }

    _atomic(ROADMAP_FILE, json.dumps(normalized, indent=2, sort_keys=True))
    return normalized


def classify_feature_request(title: str, description: str = "") -> Dict[str, Any]:
    title = _text(title, "Title", 200, True)
    description = _text(description, "Description", 5000)
    text = f"{title} {description}".casefold()

    rules = [
        (
            "security",
            "high",
            "medium",
            "safety_review",
            90,
            ("security", "permission", "approval", "secret", "token", "privacy"),
            "Requires safety review before implementation.",
        ),
        (
            "agentic_tools",
            "high",
            "high",
            "safety_review",
            85,
            ("desktop", "file", "terminal", "command", "automation", "execute"),
            "Execution features must remain approval-gated.",
        ),
        (
            "memory",
            "medium",
            "high",
            "minor_release",
            75,
            ("memory", "database", "vector", "context", "sync", "cloud"),
            "Requires data handling, privacy, and storage review.",
        ),
        (
            "voice",
            "medium",
            "high",
            "minor_release",
            70,
            ("voice", "wake", "audio", "speech"),
            "Requires device testing and clear privacy behavior.",
        ),
        (
            "bugfix",
            "medium",
            "medium",
            "patch_release",
            80,
            ("bug", "fix", "broken", "error"),
            "Prioritize when reproducible and user-facing.",
        ),
        (
            "frontend",
            "low",
            "medium",
            "minor_release",
            65,
            ("ui", "layout", "mobile", "responsive", "dashboard", "panel"),
            "Verify desktop and mobile layouts.",
        ),
        (
            "documentation",
            "low",
            "low",
            "patch_release",
            55,
            ("docs", "readme", "guide", "tutorial", "documentation"),
            "Candidate for a reviewed patch release.",
        ),
    ]

    category = "general"
    safety = "low"
    effort = "medium"
    bucket = "future"
    score = 50
    note = "Review manually before release planning."

    for c, s, e, b, p, words, n in rules:
        if any(word in text for word in words):
            category = c
            safety = s
            effort = e
            bucket = b
            score = p
            note = n
            break

    return {
        "category": category,
        "safety_level": safety,
        "effort": effort,
        "release_bucket": bucket,
        "priority_score": score,
        "governance_note": note,
        "classified_at": _now(),
    }


def add_future_feature(
    title: str,
    description: str = "",
    source: str = "manual",
) -> Dict[str, Any]:
    source = _text(source, "Source", 40, True)
    description = _text(description, "Description", 5000)
    classification = classify_feature_request(title, description)
    now = _now()

    feature = {
        "id": f"feature_{uuid.uuid4().hex}",
        "title": _text(title, "Title", 200, True),
        "description": description,
        "source": source,
        "status": "proposed",
        **classification,
        "created_at": now,
        "updated_at": now,
    }
    feature.pop("classified_at", None)

    with _LOCK:
        data = load_future_features()
        incoming_key = _feature_key(feature)

        for existing in data["features"]:
            if _feature_key(existing) == incoming_key:
                _merge_duplicate_feature(existing, feature)
                save_future_features(data)
                return existing

        data["features"].append(feature)
        save_future_features(data)

    return feature


def generate_roadmap_plan(data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    features = (data or load_future_features())["features"]
    proposed = [x.copy() for x in features if x["status"] == "proposed"]
    buckets = {bucket: [x for x in proposed if x["release_bucket"] == bucket] for bucket in BUCKETS}

    proposed.sort(key=lambda x: (-x["priority_score"], x["created_at"], x["id"]))

    next_release = (
        "v6.5-safety-review"
        if buckets["safety_review"]
        else "v6.5"
        if buckets["minor_release"]
        else "v6.5.1"
        if buckets["patch_release"]
        else "future_backlog"
        if buckets["future"]
        else "no_release_planned"
    )

    return {
        "status": "roadmap_ready" if proposed else "empty_roadmap",
        "generated_at": _now(),
        "total_features": len(features),
        "proposed_count": len(proposed),
        "patch_count": len(buckets["patch_release"]),
        "minor_count": len(buckets["minor_release"]),
        "safety_review_count": len(buckets["safety_review"]),
        "future_count": len(buckets["future"]),
        "high_safety_count": sum(x["safety_level"] == "high" for x in proposed),
        "medium_safety_count": sum(x["safety_level"] == "medium" for x in proposed),
        "low_safety_count": sum(x["safety_level"] == "low" for x in proposed),
        "next_recommended_release": next_release,
        "features": proposed,
        "release_buckets": buckets,
    }


def generate_governance_checklist() -> Dict[str, Any]:
    plan = generate_roadmap_plan()
    lock = load_version_lock()
    patch = load_patch_state()
    issues = load_known_issues()

    raw = [
        ("Stable version lock active", lock.get("locked") is True, f"Locked: {lock.get('locked')}"),
        ("Roadmap data valid", True, f"Features: {plan['total_features']}"),
        (
            "Safety-sensitive features identified",
            all(x["release_bucket"] == "safety_review" for x in plan["features"] if x["safety_level"] == "high"),
            f"Safety review: {plan['safety_review_count']}",
        ),
        (
            "Patch state valid",
            str(patch.get("patch_version", "")).startswith("v6.5."),
            f"Patch: {patch.get('patch_version')}",
        ),
        (
            "Known issue registry valid",
            isinstance(issues.get("issues"), list),
            f"Issues: {len(issues.get('issues', []))}",
        ),
    ]

    checks = [{"name": n, "ok": bool(ok), "details": d} for n, ok, d in raw]
    passed = sum(x["ok"] for x in checks)
    status = "safety_review_needed" if plan["safety_review_count"] else plan["status"]

    return {
        "status": status,
        "generated_at": _now(),
        "release_version": "v6.4",
        "release_name": "Roadmap Planner + Future Feature Governance",
        "passed": passed,
        "failed": len(checks) - passed,
        "checks": checks,
        "roadmap_plan": plan,
        "version_lock": lock,
        "safety": {
            "implements_features": False,
            "pushes_to_github": False,
            "publishes_release": False,
            "modifies_github_issues": False,
            "deletes_files": False,
            "bypasses_approvals": False,
        },
    }


def render_roadmap_report(governance: Dict[str, Any] | None = None) -> str:
    governance = governance or generate_governance_checklist()
    plan = governance["roadmap_plan"]

    lines = "\n".join(
        f"- [{x['priority_score']}] {x['title']} — {x['category']} / {x['release_bucket']} / safety: {x['safety_level']}"
        for x in plan["features"]
    ) or "None"

    return (
        f"# O.R.I.O.N. v6.4 Roadmap Planner Report\n\n"
        f"Generated: {governance['generated_at']}\n"
        f"Status: {governance['status']}\n"
        f"Next release: {plan['next_recommended_release']}\n\n"
        f"## Proposed Features\n\n"
        f"{lines}\n\n"
        f"## Safety\n\n"
        f"Planning only; no implementation, GitHub changes, publishing, deletion, or approval bypass.\n"
    )


def save_roadmap_report() -> Dict[str, Any]:
    governance = generate_governance_checklist()
    report = render_roadmap_report(governance)
    path = OUT / f"ROADMAP_PLANNER_REPORT_{_stamp()}.md"

    _atomic(path, report)

    return {
        "status": "saved",
        "generated_at": _now(),
        "path": str(path),
        "report": report,
        "governance": governance,
    }


def generate_roadmap_package() -> Dict[str, Any]:
    governance = generate_governance_checklist()
    report = render_roadmap_report(governance)
    stamp = _stamp()

    report_path = OUT / f"ROADMAP_REPORT_{stamp}.md"
    plan_path = OUT / f"FUTURE_RELEASE_PLAN_{stamp}.md"
    summary_path = OUT / f"ROADMAP_SUMMARY_{stamp}.json"

    plan = governance["roadmap_plan"]
    future = (
        f"# Future Release Plan\n\n"
        f"Next recommended release: {plan['next_recommended_release']}\n\n"
        f"Safety review items: {plan['safety_review_count']}\n"
        f"No feature is implemented automatically.\n"
    )

    summary = {
        "status": governance["status"],
        "generated_at": _now(),
        "release_version": "v6.4",
        "release_name": governance["release_name"],
        "passed": governance["passed"],
        "failed": governance["failed"],
        "next_recommended_release": plan["next_recommended_release"],
        "report_path": str(report_path),
        "future_plan_path": str(plan_path),
        "summary_path": str(summary_path),
        "safety": governance["safety"],
    }

    _atomic(report_path, report)
    _atomic(plan_path, future)
    _atomic(summary_path, json.dumps(summary, indent=2, sort_keys=True))

    return summary
