"""Read-only GitHub launch checks and local artifact generation."""

from __future__ import annotations

import os
import re
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List


PROJECT_ROOT = Path(__file__).resolve().parents[2]
POLISH_DIR = PROJECT_ROOT / "backend" / "data" / "github_polish"
SCREENSHOTS_DIR = PROJECT_ROOT / "assets" / "screenshots"

REQUIRED_PUBLIC_FILES = (
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    ".gitignore",
    "requirements.txt",
    "docs/public-release-v5.md",
    "docs/quality-gate-v4-9.md",
    "docs/github-polish-v5-1.md",
)
EXPECTED_SCREENSHOTS = (
    "aurora-os-dashboard.png",
    "dashboard-intelligence.png",
    "dashboard-views.png",
    "security-policy.png",
    "plugin-system.png",
    "tool-permission-enforcement.png",
    "tool-audit-center.png",
    "quality-gate.png",
    "public-release.png",
    "release-candidate.png",
)
REQUIRED_GITIGNORE_ENTRIES = (
    ".env",
    "backend/.env",
    "frontend/.next/",
    "frontend/node_modules/",
    "backend/data/*.sqlite",
    "backend/data/*.db",
    "backend/data/github_polish/",
    "backend/data/portfolio_showcase/",
)
SCANNED_SUFFIXES = {
    ".env", ".example", ".js", ".json", ".jsx", ".key", ".md",
    ".pem", ".py", ".ts", ".tsx", ".txt", ".yaml", ".yml",
}
MAX_SCAN_BYTES = 2_000_000
PLACEHOLDERS = {
    "", "change-me", "changeme", "example", "placeholder", "replace-me",
    "test", "todo", "your-api-key", "your_api_key", "xxx", "xxxxx",
}
SECRET_ASSIGNMENT = re.compile(
    r"(?im)^\s*(?:export\s+)?([A-Z][A-Z0-9_]*(?:API_KEY|ADMIN_KEY|SECRET|PASSWORD|TOKEN))\s*[:=]\s*[\"']?([^\s\"'#]+)"
)
PRIVATE_KEY_MARKER = "-----BEGIN " + "PRIVATE KEY-----"
RSA_KEY_MARKER = "-----BEGIN RSA " + "PRIVATE KEY-----"
OPENSSH_KEY_MARKER = "-----BEGIN OPENSSH " + "PRIVATE KEY-----"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _tracked_files() -> Iterable[Path]:
    """Return only files that could be published by Git."""
    try:
        result = subprocess.run(
            ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            check=True,
            timeout=15,
        )
    except (OSError, subprocess.SubprocessError):
        return ()
    return tuple(
        PROJECT_ROOT / item.decode("utf-8", errors="surrogateescape")
        for item in result.stdout.split(b"\0")
        if item
    )


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as handle:
        handle.write(content)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)


def check_required_public_files() -> Dict[str, Any]:
    files = [
        {"path": relative, "exists": (PROJECT_ROOT / relative).is_file()}
        for relative in REQUIRED_PUBLIC_FILES
    ]
    missing = [item for item in files if not item["exists"]]
    return {"files": files, "missing": missing, "missing_count": len(missing), "ok": not missing}


def check_screenshot_readiness() -> Dict[str, Any]:
    expected = [
        {"path": f"assets/screenshots/{name}", "exists": (SCREENSHOTS_DIR / name).is_file()}
        for name in EXPECTED_SCREENSHOTS
    ]
    existing = (
        sorted(str(path.relative_to(PROJECT_ROOT)) for path in SCREENSHOTS_DIR.glob("*.png"))
        if SCREENSHOTS_DIR.exists()
        else []
    )
    missing = [item for item in expected if not item["exists"]]
    return {"expected": expected, "existing_pngs": existing, "existing_count": len(existing), "missing": missing, "missing_count": len(missing), "ok": not missing}


def check_gitignore_safety() -> Dict[str, Any]:
    path = PROJECT_ROOT / ".gitignore"
    entries = {
        line.strip() for line in path.read_text(encoding="utf-8", errors="ignore").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    } if path.is_file() else set()
    missing = [entry for entry in REQUIRED_GITIGNORE_ENTRIES if entry not in entries]
    return {"ok": path.is_file() and not missing, "missing_entries": missing}


def scan_for_sensitive_patterns() -> Dict[str, Any]:
    """Scan publishable files without returning any suspected secret value."""
    findings: List[Dict[str, Any]] = []
    scanned_count = 0
    for path in _tracked_files():
        if not path.is_file() or path.suffix.lower() not in SCANNED_SUFFIXES:
            continue
        try:
            if path.stat().st_size > MAX_SCAN_BYTES:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        scanned_count += 1
        relative = str(path.relative_to(PROJECT_ROOT))
        for marker, category in (
            (PRIVATE_KEY_MARKER, "private_key"),
            (RSA_KEY_MARKER, "rsa_private_key"),
            (OPENSSH_KEY_MARKER, "openssh_private_key"),
        ):
            if marker in text:
                findings.append({"path": relative, "category": category})
        if path.name.endswith(".example"):
            continue
        for match in SECRET_ASSIGNMENT.finditer(text):
            value = match.group(2).strip().lower()
            if value in PLACEHOLDERS or value.startswith(("your-", "your_", "${", "<")):
                continue
            findings.append({
                "path": relative,
                "category": "credential_assignment",
                "line": text.count("\n", 0, match.start()) + 1,
            })
    return {
        "ok": not findings,
        "scanned_file_count": scanned_count,
        "finding_count": len(findings),
        "findings": findings,
    }


def generate_github_description() -> str:
    return "Local-first AI desktop agent with Aurora OS dashboard, approval-gated tools, plugin permissions, audit logs, release verification, and a portfolio-ready demo package."


def generate_github_topics() -> List[str]:
    return ["ai-agent", "desktop-agent", "fastapi", "nextjs", "tauri", "typescript", "python", "sqlite", "tool-orchestration", "ai-dashboard", "local-first", "approval-gated", "portfolio-project"]


def generate_portfolio_case_study() -> str:
    return """# O.R.I.O.N. Portfolio Case Study

O.R.I.O.N. combines a local FastAPI backend, Aurora OS dashboard, approval-gated tools, plugin permissions, audit history, and release-readiness reporting. It demonstrates a local-first approach to safe agentic workflows without automatic publishing or uncontrolled execution.
"""


def generate_final_commit_plan() -> str:
    return """# O.R.I.O.N. Final Commit Plan

Run the backend and frontend checks, review `git status`, and verify that no `.env`, local databases, logs, generated reports, or build outputs are staged. This plan prepares assets only; it does not push or publish.
"""


def generate_github_polish_checklist() -> Dict[str, Any]:
    required = check_required_public_files()
    screenshots = check_screenshot_readiness()
    gitignore = check_gitignore_safety()
    secrets = scan_for_sensitive_patterns()
    checks = [
        {"name": "Required public files present", "ok": required["ok"], "details": f"Missing: {required['missing_count']}"},
        {"name": "Screenshot checklist ready", "ok": screenshots["existing_count"] > 0, "details": f"Existing: {screenshots['existing_count']} | Missing expected: {screenshots['missing_count']}"},
        {"name": ".gitignore protects local/private files", "ok": gitignore["ok"], "details": f"Missing entries: {len(gitignore['missing_entries'])}"},
        {"name": "Sensitive pattern scan clean", "ok": secrets["ok"], "details": f"Scanned: {secrets['scanned_file_count']} | Findings: {secrets['finding_count']}"},
        {"name": "GitHub description generated", "ok": True, "details": generate_github_description()},
        {"name": "GitHub topics generated", "ok": True, "details": ", ".join(generate_github_topics())},
    ]
    failed = sum(not check["ok"] for check in checks)
    return {
        "status": "ready" if not failed else "review_needed",
        "generated_at": _now(),
        "passed": len(checks) - failed,
        "failed": failed,
        "checks": checks,
        "required_files": required,
        "screenshots": screenshots,
        "gitignore": gitignore,
        "secrets": secrets,
        "github_description": generate_github_description(),
        "github_topics": generate_github_topics(),
    }


def render_github_polish_report(checklist: Dict[str, Any] | None = None) -> str:
    checklist = checklist or generate_github_polish_checklist()
    checks = "\n".join(
        f"- [{'x' if check['ok'] else ' '}] {check['name']} — {check['details']}"
        for check in checklist["checks"]
    )
    finding_paths = "\n".join(
        f"- {item['path']}: {item['category']}"
        for item in checklist["secrets"]["findings"]
    ) or "None"
    return f"""# O.R.I.O.N. v6.5 GitHub Repository Polish Report

Generated: {checklist['generated_at']}
Status: {checklist['status']}

## Checks

{checks}

## Sensitive Findings

{finding_paths}

## Safety

This report does not include secret values and does not push, publish, or delete.
"""


def save_github_polish_artifacts() -> Dict[str, Any]:
    stamp = _timestamp()
    checklist = generate_github_polish_checklist()
    report = render_github_polish_report(checklist)
    content = {
        "github_polish_report": (f"GITHUB_POLISH_REPORT_{stamp}.md", report),
        "portfolio_case_study": (f"PORTFOLIO_CASE_STUDY_{stamp}.md", generate_portfolio_case_study()),
        "final_commit_plan": (f"FINAL_COMMIT_PLAN_{stamp}.md", generate_final_commit_plan()),
        "github_description": (f"GITHUB_DESCRIPTION_{stamp}.txt", generate_github_description()),
        "github_topics": (f"GITHUB_TOPICS_{stamp}.txt", "\n".join(generate_github_topics())),
    }
    artifacts: Dict[str, str] = {}
    for key, (name, body) in content.items():
        path = POLISH_DIR / name
        _atomic_write(path, body)
        artifacts[key] = str(path)
    return {"status": "saved", "generated_at": _now(), "artifacts": artifacts, "report": report, "checklist": checklist}
