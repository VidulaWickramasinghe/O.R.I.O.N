"""Local-only GitHub launch preparation checks and artifact generation."""
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

PROJECT_ROOT = Path(__file__).resolve().parents[2]
POLISH_DIR = PROJECT_ROOT / "backend" / "data" / "github_polish"
SCREENSHOTS_DIR = PROJECT_ROOT / "assets" / "screenshots"
POLISH_DIR.mkdir(parents=True, exist_ok=True)

REQUIRED_PUBLIC_FILES = ["README.md", "CHANGELOG.md", "LICENSE", ".gitignore", "requirements.txt", "docs/public-release-v5.md", "docs/quality-gate-v4-9.md", "docs/github-polish-v5-1.md"]
EXPECTED_SCREENSHOTS = ["aurora-os-dashboard.png", "dashboard-intelligence.png", "dashboard-views.png", "security-policy.png", "plugin-system.png", "tool-permission-enforcement.png", "tool-audit-center.png", "quality-gate.png", "public-release.png", "release-candidate.png"]
SENSITIVE_PATTERNS = ("BEGIN RSA PRIVATE KEY", "BEGIN OPENSSH PRIVATE KEY", "BEGIN PRIVATE KEY")


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def check_required_public_files() -> Dict[str, Any]:
    files = [{"path": path, "exists": (PROJECT_ROOT / path).is_file()} for path in REQUIRED_PUBLIC_FILES]
    missing = [item for item in files if not item["exists"]]
    return {"files": files, "missing": missing, "missing_count": len(missing), "ok": not missing}


def check_screenshot_readiness() -> Dict[str, Any]:
    expected = [{"path": f"assets/screenshots/{name}", "exists": (SCREENSHOTS_DIR / name).is_file()} for name in EXPECTED_SCREENSHOTS]
    existing = sorted(str(path.relative_to(PROJECT_ROOT)) for path in SCREENSHOTS_DIR.glob("*.png")) if SCREENSHOTS_DIR.exists() else []
    missing = [item for item in expected if not item["exists"]]
    return {"expected": expected, "existing_pngs": existing, "existing_count": len(existing), "missing": missing, "missing_count": len(missing), "ok": not missing}


def check_gitignore_safety() -> Dict[str, Any]:
    path = PROJECT_ROOT / ".gitignore"
    required = [".env", "backend/.env", "frontend/.next/", "frontend/node_modules/", "backend/data/*.sqlite", "backend/data/*.db"]
    text = path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""
    missing = [entry for entry in required if entry not in text]
    return {"ok": path.exists() and not missing, "missing_entries": missing}


def scan_for_sensitive_patterns() -> Dict[str, Any]:
    findings: List[Dict[str, str]] = []
    ignored = {".git", ".venv", "node_modules", ".next", "backend/data", "__pycache__"}
    for path in PROJECT_ROOT.rglob("*"):
        if not path.is_file() or any(part in str(path.relative_to(PROJECT_ROOT)) for part in ignored):
            continue
        if path.suffix not in {".py", ".ts", ".tsx", ".js", ".json", ".md", ".txt", ".pem", ".key"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in SENSITIVE_PATTERNS:
            if pattern in text:
                findings.append({"path": str(path.relative_to(PROJECT_ROOT)), "pattern": pattern})
    return {"ok": not findings, "finding_count": len(findings), "findings": findings}


def generate_github_description() -> str:
    return "Local-first AI desktop agent with Aurora OS dashboard, approval-gated tools, plugin permissions, audit logs, release verification, and a portfolio-ready demo package."


def generate_github_topics() -> List[str]:
    return ["ai-agent", "desktop-agent", "fastapi", "nextjs", "tauri", "typescript", "python", "sqlite", "tool-orchestration", "ai-dashboard", "local-first", "approval-gated", "portfolio-project"]


def generate_portfolio_case_study() -> str:
    return """# O.R.I.O.N. Portfolio Case Study\n\nO.R.I.O.N. combines a local FastAPI backend, Aurora OS dashboard, approval-gated tools, plugin permissions, audit history, and release-readiness reporting. It demonstrates a local-first approach to safe agentic workflows without automatic publishing or uncontrolled execution.\n"""


def generate_final_commit_plan() -> str:
    return """# O.R.I.O.N. v5.1 Final Commit Plan\n\nRun the backend and frontend checks, review `git status`, and verify that no `.env`, local databases, logs, or build outputs are staged. This plan prepares assets only; it does not push or publish.\n"""


def generate_github_polish_checklist() -> Dict[str, Any]:
    required, screenshots, gitignore, secrets = check_required_public_files(), check_screenshot_readiness(), check_gitignore_safety(), scan_for_sensitive_patterns()
    checks = [
        {"name": "Required public files present", "ok": required["ok"], "details": f"Missing: {required['missing_count']}"},
        {"name": "Screenshot checklist ready", "ok": screenshots["existing_count"] > 0, "details": f"Existing: {screenshots['existing_count']} | Missing expected: {screenshots['missing_count']}"},
        {"name": ".gitignore protects local/private files", "ok": gitignore["ok"], "details": f"Missing entries: {len(gitignore['missing_entries'])}"},
        {"name": "Sensitive pattern scan clean", "ok": secrets["ok"], "details": f"Findings: {secrets['finding_count']}"},
        {"name": "GitHub description generated", "ok": True, "details": generate_github_description()},
        {"name": "GitHub topics generated", "ok": True, "details": ", ".join(generate_github_topics())},
    ]
    failed = sum(not check["ok"] for check in checks)
    return {"status": "ready" if not failed else "review_needed", "generated_at": _now(), "passed": len(checks) - failed, "failed": failed, "checks": checks, "github_description": generate_github_description(), "github_topics": generate_github_topics()}


def render_github_polish_report() -> str:
    result = generate_github_polish_checklist()
    checks = "\n".join(f"- [{'x' if check['ok'] else ' '}] {check['name']} — {check['details']}" for check in result["checks"])
    return f"# O.R.I.O.N. v5.1 GitHub Repository Polish Report\n\nGenerated: {result['generated_at']}\nStatus: {result['status']}\n\n## Checks\n\n{checks}\n\n## Safety\n\nThis report does not push, publish, delete, or expose secrets.\n"


def save_github_polish_artifacts() -> Dict[str, Any]:
    stamp = _timestamp()
    artifacts = {"github_polish_report": POLISH_DIR / f"GITHUB_POLISH_REPORT_{stamp}.md", "portfolio_case_study": POLISH_DIR / f"PORTFOLIO_CASE_STUDY_{stamp}.md", "final_commit_plan": POLISH_DIR / f"FINAL_COMMIT_PLAN_{stamp}.md", "github_description": POLISH_DIR / f"GITHUB_DESCRIPTION_{stamp}.txt", "github_topics": POLISH_DIR / f"GITHUB_TOPICS_{stamp}.txt"}
    artifacts["github_polish_report"].write_text(render_github_polish_report(), encoding="utf-8")
    artifacts["portfolio_case_study"].write_text(generate_portfolio_case_study(), encoding="utf-8")
    artifacts["final_commit_plan"].write_text(generate_final_commit_plan(), encoding="utf-8")
    artifacts["github_description"].write_text(generate_github_description(), encoding="utf-8")
    artifacts["github_topics"].write_text("\n".join(generate_github_topics()), encoding="utf-8")
    return {"status": "saved", "generated_at": _now(), "artifacts": {key: str(value) for key, value in artifacts.items()}, "report": render_github_polish_report()}
