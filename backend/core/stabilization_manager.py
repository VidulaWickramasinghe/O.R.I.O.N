"""Read-only codebase diagnostics for the O.R.I.O.N. stabilization workflow."""

import ast
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
STABILIZATION_DIR = BACKEND_DIR / "data" / "stabilization_reports"
STABILIZATION_DIR.mkdir(parents=True, exist_ok=True)

IMPORTANT_BACKEND_FILES = [
    "backend/api_main.py", "backend/main.py", "backend/voice_main.py", "backend/wake_main.py",
    "backend/core/activity.py", "backend/core/tool_logger.py", "backend/core/persistent_memory.py",
    "backend/core/mission_planner.py", "backend/core/approvals.py", "backend/core/mission_run_history.py",
    "backend/core/workspace_manager.py", "backend/core/github_release_assistant.py",
    "backend/core/browser_research.py", "backend/core/voice_state.py", "backend/core/context_engine.py",
    "backend/core/desktop_control.py", "backend/core/portfolio_demo.py", "backend/core/system_doctor.py",
    "backend/core/knowledge_base.py", "backend/core/vector_memory.py", "backend/core/workflow_blueprints.py",
    "backend/core/developer_agent.py", "backend/core/dashboard_intelligence.py",
    "backend/core/notification_engine.py", "backend/core/user_settings.py", "backend/core/plugin_registry.py",
    "backend/core/backend_sidecar.py", "backend/core/tool_permissions.py", "backend/core/tool_audit.py",
    "backend/core/security_policy.py", "backend/core/release_candidate.py", "backend/core/stabilization_manager.py",
    "backend/tools/safe_tools.py", "backend/tools/project_tools.py", "backend/tools/dev_tools.py",
    "backend/tools/memory_tools.py", "backend/tools/mission_tools.py", "backend/tools/workspace_tools.py",
    "backend/tools/github_release_tools.py", "backend/tools/browser_research_tools.py",
    "backend/tools/context_tools.py", "backend/tools/desktop_tools.py", "backend/tools/portfolio_demo_tools.py",
    "backend/tools/system_doctor_tools.py", "backend/tools/knowledge_tools.py",
    "backend/tools/vector_memory_tools.py", "backend/tools/workflow_blueprint_tools.py",
    "backend/tools/developer_agent_tools.py", "backend/tools/dashboard_intelligence_tools.py",
    "backend/tools/notification_tools.py", "backend/tools/user_settings_tools.py",
    "backend/tools/plugin_registry_tools.py", "backend/tools/backend_sidecar_tools.py",
    "backend/tools/tool_permission_tools.py", "backend/tools/tool_audit_tools.py",
    "backend/tools/security_policy_tools.py", "backend/tools/release_candidate_tools.py",
    "backend/tools/stabilization_tools.py", "backend/voice/voice_io.py", "backend/voice/wake_word.py",
]

IMPORTANT_FRONTEND_FILE_OPTIONS = [
    ("frontend/package.json",),
    ("frontend/next.config.ts", "frontend/next.config.js"),
    ("frontend/src/app/page.tsx",),
    ("frontend/src/app/globals.css",),
    ("frontend/src-tauri/tauri.conf.json",),
]

RISK_PATTERNS = ("TODO", "FIXME", "print(", "console.log", "except Exception", "pass")
SOURCE_EXTENSIONS = {".py", ".tsx", ".ts", ".js", ".jsx", ".css", ".json", ".md"}
IGNORED_PARTS = {".git", ".venv", "node_modules", ".next", "out", "target", "__pycache__", "dist", "build", "data"}
_SCAN_CACHE: Dict[str, Any] = {"created_at": None, "scan": None}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _run_command(command: List[str], cwd: Path = PROJECT_ROOT, timeout: int = 40) -> Dict[str, Any]:
    try:
        result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return {"ok": result.returncode == 0, "returncode": result.returncode,
                "stdout": result.stdout[-5000:], "stderr": result.stderr[-5000:],
                "command": " ".join(command)}
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"ok": False, "returncode": -1, "stdout": "", "stderr": str(error),
                "command": " ".join(command)}


def _source_files() -> Iterable[Path]:
    for base in (BACKEND_DIR, FRONTEND_DIR):
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.is_file() and path.suffix in SOURCE_EXTENSIONS and not any(part in IGNORED_PARTS for part in path.parts):
                yield path


def check_required_files() -> Dict[str, Any]:
    required = list(IMPORTANT_BACKEND_FILES)
    missing = [item for item in required if not (PROJECT_ROOT / item).exists()]
    present = [item for item in required if (PROJECT_ROOT / item).exists()]
    for options in IMPORTANT_FRONTEND_FILE_OPTIONS:
        existing = [item for item in options if (PROJECT_ROOT / item).exists()]
        if existing:
            present.extend(existing)
        else:
            missing.append(" or ".join(options))
    return {"ok": not missing, "present_count": len(present), "missing_count": len(missing),
            "present": present, "missing": missing}


def scan_code_risks() -> Dict[str, Any]:
    findings: List[Dict[str, Any]] = []
    scanned = 0
    for path in _source_files():
        scanned += 1
        relative = str(path.relative_to(PROJECT_ROOT))
        try:
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except OSError:
            continue
        for number, line in enumerate(lines, start=1):
            for pattern in RISK_PATTERNS:
                if pattern in line:
                    findings.append({"file": relative, "line": number, "pattern": pattern,
                                     "preview": line.strip()[:220]})
    return {"ok": True, "scanned_files": scanned, "finding_count": len(findings), "findings": findings[:250]}


def check_import_style_risks() -> Dict[str, Any]:
    risks: List[Dict[str, str]] = []
    for path in BACKEND_DIR.rglob("*.py"):
        if any(part in IGNORED_PARTS for part in path.parts):
            continue
        relative = str(path.relative_to(PROJECT_ROOT))
        text = path.read_text(encoding="utf-8", errors="ignore")
        if "from backend.core" in text or "from backend.tools" in text:
            risks.append({"file": relative, "risk": "Uses backend.* imports; runtime expects core.* / tools.*."})
        if "sys.path.append" in text:
            risks.append({"file": relative, "risk": "Manual sys.path modification found."})
        try:
            ast.parse(text, filename=relative)
        except SyntaxError as error:
            risks.append({"file": relative, "risk": f"Python syntax error: {error.msg} (line {error.lineno})."})
    return {"ok": not risks, "risk_count": len(risks), "risks": risks}


def scan_duplicate_risk_zones() -> Dict[str, Any]:
    """Identify exact duplicate source files without proposing deletion."""
    groups: Dict[str, List[str]] = {}
    for path in _source_files():
        if path.suffix not in {".py", ".ts", ".tsx", ".js", ".jsx"}:
            continue
        try:
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
        except OSError:
            continue
        groups.setdefault(digest, []).append(str(path.relative_to(PROJECT_ROOT)))
    duplicates = [{"files": paths, "count": len(paths)} for paths in groups.values() if len(paths) > 1]
    return {"ok": True, "duplicate_group_count": len(duplicates), "duplicate_groups": duplicates[:100]}


def check_backend_compile() -> Dict[str, Any]:
    files = [str(PROJECT_ROOT / item) for item in IMPORTANT_BACKEND_FILES if (PROJECT_ROOT / item).exists()]
    if not files:
        return {"ok": False, "command": "python -m py_compile", "stdout": "", "stderr": "No backend files found."}
    return _run_command(["python", "-m", "py_compile", *files])


def check_frontend_build_available() -> Dict[str, Any]:
    if not (FRONTEND_DIR / "package.json").exists():
        return {"ok": False, "command": "npm run build", "stdout": "", "stderr": "frontend/package.json not found."}
    return _run_command(["npm", "run", "build"], cwd=FRONTEND_DIR, timeout=120)


def generate_cleanup_checklist() -> Dict[str, Any]:
    required, imports, risks, duplicates = (check_required_files(), check_import_style_risks(), scan_code_risks(), scan_duplicate_risk_zones())
    items = [
        {"item": "All important backend/frontend files exist", "ok": required["ok"], "details": f"Missing files: {required['missing_count']}"},
        {"item": "Backend import style is consistent", "ok": imports["ok"], "details": f"Import risks: {imports['risk_count']}"},
        {"item": "Code risk scan completed", "ok": True, "details": f"Findings: {risks['finding_count']}"},
        {"item": "Duplicate source risk zones identified", "ok": True, "details": f"Duplicate groups: {duplicates['duplicate_group_count']}"},
        {"item": "No large cleanup should happen without approval", "ok": True, "details": "v4.1 only scans and reports."},
    ]
    passed = sum(item["ok"] for item in items)
    return {"passed": passed, "failed": len(items) - passed, "items": items}


def run_stabilization_scan(run_build: bool = False) -> Dict[str, Any]:
    cached_at = _SCAN_CACHE["created_at"]
    cached_scan = _SCAN_CACHE["scan"]
    if not run_build and cached_at and cached_scan and (datetime.now() - cached_at).total_seconds() < 15:
        return cached_scan
    required = check_required_files()
    imports = check_import_style_risks()
    risks = scan_code_risks()
    duplicates = scan_duplicate_risk_zones()
    compile_result = check_backend_compile()
    frontend = check_frontend_build_available() if run_build else {
        "ok": None, "command": "npm run build", "stdout": "", "stderr": "Skipped. Set run_build=true to run frontend build."
    }
    status = "stable"
    if not required["ok"] or not compile_result["ok"]:
        status = "needs_attention"
    elif imports["risk_count"]:
        status = "review_recommended"
    elif risks["finding_count"] > 80 or duplicates["duplicate_group_count"]:
        status = "cleanup_recommended"
    scan = {"status": status, "generated_at": _now(), "required_files": required, "import_risks": imports,
            "code_risks": risks, "duplicate_risk_zones": duplicates, "cleanup_checklist": generate_cleanup_checklist(),
            "backend_compile": compile_result, "frontend_build": frontend}
    if not run_build:
        _SCAN_CACHE.update({"created_at": datetime.now(), "scan": scan})
    return scan


def render_stabilization_report(run_build: bool = False) -> str:
    scan = run_stabilization_scan(run_build)
    checklist = "\n".join(f"- [{'x' if item['ok'] else ' '}] {item['item']} — {item['details']}" for item in scan["cleanup_checklist"]["items"])
    missing = "\n".join(f"- {item}" for item in scan["required_files"]["missing"]) or "No missing important files."
    imports = "\n".join(f"- {item['file']}: {item['risk']}" for item in scan["import_risks"]["risks"]) or "No import style risks detected."
    findings = "\n".join(f"- {item['file']}:{item['line']} | {item['pattern']} | {item['preview']}" for item in scan["code_risks"]["findings"][:80]) or "No risk-pattern findings."
    duplicates = "\n".join(f"- {', '.join(item['files'])}" for item in scan["duplicate_risk_zones"]["duplicate_groups"]) or "No exact duplicate source groups detected."
    return f"""# O.R.I.O.N. v4.1 Stabilization Report

Generated: {scan['generated_at']}
Status: {scan['status']}

## Cleanup Checklist

Passed: {scan['cleanup_checklist']['passed']}
Failed: {scan['cleanup_checklist']['failed']}

{checklist}

## Required Files

Present: {scan['required_files']['present_count']}
Missing: {scan['required_files']['missing_count']}

{missing}

## Import Style Risks

Risk Count: {scan['import_risks']['risk_count']}

{imports}

## Code Risk Findings

Scanned Files: {scan['code_risks']['scanned_files']}
Finding Count: {scan['code_risks']['finding_count']}

{findings}

## Duplicate Risk Zones

Duplicate Groups: {scan['duplicate_risk_zones']['duplicate_group_count']}

{duplicates}

## Backend Compile

- OK: {scan['backend_compile']['ok']}
- Command: {scan['backend_compile']['command']}

```text
{scan['backend_compile']['stderr'] or scan['backend_compile']['stdout'] or 'No output.'}
```

## Frontend Build

- OK: {scan['frontend_build']['ok']}
- Command: {scan['frontend_build']['command']}

```text
{scan['frontend_build']['stderr'] or scan['frontend_build']['stdout'] or 'No output.'}
```

## Stabilization Notes

- Do not delete files automatically.
- Do not rewrite major modules without approval.
- Fix compile errors first, then import style issues, then reduce duplication and layout crowding.
"""


def save_stabilization_report(run_build: bool = False) -> Dict[str, Any]:
    report = render_stabilization_report(run_build)
    path = STABILIZATION_DIR / f"orion_v4_1_stabilization_report_{datetime.now():%Y%m%d_%H%M%S}.md"
    path.write_text(report, encoding="utf-8")
    return {"status": "saved", "path": str(path), "report": report, "generated_at": _now()}
