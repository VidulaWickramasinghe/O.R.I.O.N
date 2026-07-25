"""Local-only GitHub launch draft and template proposal generation."""

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from core.final_launch import (
    generate_final_launch_checklist,
    load_final_launch_freeze_state,
)
from core.github_polish import generate_github_description, generate_github_topics
from core.release_verification import generate_release_verification_snapshot


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "backend" / "data" / "github_launch"
GITHUB_DIR = ROOT / ".github"
ISSUES = GITHUB_DIR / "ISSUE_TEMPLATE"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as handle:
        handle.write(content)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)


def generate_readme_badges() -> str:
    return """![Version](https://img.shields.io/badge/version-v6.2-cyan)
![Safety](https://img.shields.io/badge/safety-approval--gated-blue)
![License](https://img.shields.io/badge/license-see--LICENSE-lightgrey)
"""


def generate_release_draft() -> str:
    return """# O.R.I.O.N. v6.2 — Production Hardening

O.R.I.O.N. is a local-first AI desktop agent with the Aurora OS dashboard,
approval-gated tools, plugin permissions, audit logs, and release verification.

## Safety

This draft does not push, publish, delete, expose secrets, or bypass approvals.
"""


def generate_safe_push_checklist() -> str:
    return """# O.R.I.O.N. Safe Push Checklist

- [ ] Run `./scripts/test_backend.sh`
- [ ] Run `./scripts/test_frontend.sh`
- [ ] Run `./scripts/quality_gate.sh`
- [ ] Confirm `.env`, databases, generated reports, and build output are not staged
- [ ] Review `git diff --cached --stat`
- [ ] Review screenshots for private data

Push only after manual review. This assistant never runs `git push`.
"""


def _template_content() -> Dict[str, str]:
    return {
        "bug_report": "---\nname: Bug report\n---\n\nDescribe the issue. Do not include keys, tokens, `.env` contents, or private data.\n",
        "feature_request": "---\nname: Feature request\n---\n\n## Request\n\n## Safety Considerations\n",
        "pull_request_template": "# Pull Request\n\n## Summary\n\n## Safety Checklist\n- [ ] Does not expose secrets\n- [ ] Does not bypass approvals\n- [ ] Does not add uncontrolled automation\n\n## Testing\n",
    }


def write_github_templates(destination: Path | None = None) -> Dict[str, str]:
    """Write proposals under generated data, never overwrite repository files."""
    destination = destination or (OUT / "proposed_templates")
    paths = {
        "bug_report": destination / "ISSUE_TEMPLATE" / "bug_report.md",
        "feature_request": destination / "ISSUE_TEMPLATE" / "feature_request.md",
        "pull_request_template": destination / "pull_request_template.md",
    }
    for key, path in paths.items():
        _atomic_write(path, _template_content()[key])
    return {key: str(path) for key, path in paths.items()}


def generate_github_launch_checklist() -> Dict[str, Any]:
    final = generate_final_launch_checklist()
    verification = generate_release_verification_snapshot()
    freeze = load_final_launch_freeze_state()
    checks = [
        {"name": "Final launch marker is active", "ok": freeze["frozen"], "details": f"Frozen: {freeze['frozen']}"},
        {"name": "Final launch checklist clean", "ok": final["failed"] == 0, "details": f"Failed: {final['failed']}"},
        {"name": "Release verification passed", "ok": verification["status"] == "passed", "details": verification["status"]},
        {"name": "README exists", "ok": (ROOT / "README.md").is_file(), "details": "README.md"},
        {"name": "CHANGELOG exists", "ok": (ROOT / "CHANGELOG.md").is_file(), "details": "CHANGELOG.md"},
        {"name": "LICENSE exists", "ok": (ROOT / "LICENSE").is_file(), "details": "LICENSE"},
        {"name": "Bug template ready", "ok": (ISSUES / "bug_report.md").is_file(), "details": ".github/ISSUE_TEMPLATE/bug_report.md"},
        {"name": "Feature template ready", "ok": (ISSUES / "feature_request.md").is_file(), "details": ".github/ISSUE_TEMPLATE/feature_request.md"},
        {"name": "Pull request template ready", "ok": (GITHUB_DIR / "pull_request_template.md").is_file(), "details": ".github/pull_request_template.md"},
    ]
    passed = sum(check["ok"] for check in checks)
    return {
        "status": "github_ready" if passed == len(checks) else "review_needed",
        "generated_at": _now(),
        "passed": passed,
        "failed": len(checks) - passed,
        "checks": checks,
        "description": generate_github_description(),
        "topics": generate_github_topics(),
        "badges": generate_readme_badges(),
        "release_draft": generate_release_draft(),
        "safe_push_checklist": generate_safe_push_checklist(),
    }


def render_github_launch_report(checklist: Dict[str, Any] | None = None) -> str:
    checklist = checklist or generate_github_launch_checklist()
    lines = "\n".join(
        f"- [{'x' if check['ok'] else ' '}] {check['name']} — {check['details']}"
        for check in checklist["checks"]
    )
    return f"""# O.R.I.O.N. v6.2 GitHub Launch Assistant Report

Generated: {checklist['generated_at']}
Status: {checklist['status']}
Passed: {checklist['passed']}
Failed: {checklist['failed']}

## Checks

{lines}

## Safety

No push, publishing, deletion, secret exposure, repository-template overwrite,
or approval bypass is performed.
"""


def save_github_launch_artifacts(write_templates: bool = True) -> Dict[str, Any]:
    stamp = _stamp()
    checklist = generate_github_launch_checklist()
    report = render_github_launch_report(checklist)
    content = {
        "github_launch_report": (f"GITHUB_LAUNCH_REPORT_{stamp}.md", report),
        "release_draft": (f"GITHUB_RELEASE_DRAFT_{stamp}.md", checklist["release_draft"]),
        "safe_push_checklist": (f"SAFE_PUSH_CHECKLIST_{stamp}.md", checklist["safe_push_checklist"]),
        "readme_badges": (f"README_BADGES_{stamp}.md", checklist["badges"]),
    }
    artifacts: Dict[str, str] = {}
    for key, (name, body) in content.items():
        path = OUT / name
        _atomic_write(path, body)
        artifacts[key] = str(path)
    templates = write_github_templates(OUT / f"PROPOSED_TEMPLATES_{stamp}") if write_templates else {}
    result = {
        **checklist,
        "artifacts": artifacts,
        "templates": templates,
        "safety": {"pushes_to_github": False, "publishes_release": False, "deletes_files": False, "overwrites_repository_templates": False, "bypasses_approvals": False},
    }
    summary_path = OUT / f"GITHUB_LAUNCH_SUMMARY_{stamp}.json"
    result["summary_path"] = str(summary_path)
    result["report"] = report
    _atomic_write(summary_path, json.dumps(result, indent=2, sort_keys=True))
    return result
