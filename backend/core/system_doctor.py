"""Production-readiness diagnostics for local O.R.I.O.N. installations."""

import importlib.util
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from .backend_sidecar import get_sidecar_status


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

REQUIRED_PYTHON_MODULES = ("fastapi", "uvicorn", "openai", "agents", "dotenv", "pydantic")
OPTIONAL_PYTHON_MODULES = ("sounddevice", "pyttsx3", "numpy")
REQUIRED_FILES = (
    "backend/api_main.py",
    "backend/main.py",
    "backend/core/prompt.py",
    "backend/.env.example",
    "frontend/package.json",
    "README.md",
    "CHANGELOG.md",
)
REQUIRED_DIRECTORIES = ("backend", "backend/core", "backend/tools", "backend/data", "frontend", "scripts", "docs")
REQUIRED_IGNORE_RULES = (
    ".env",
    "backend/.env",
    "backend/data/*.sqlite",
    "backend/data/*.db",
    "frontend/node_modules/",
    "frontend/.next/",
)


def _check(name: str, ok: bool, details: str, recommendation: str) -> Dict[str, Any]:
    return {"name": name, "ok": ok, "details": details, "recommendation": recommendation}


def _run_command(command: List[str], timeout: int = 30) -> Dict[str, Any]:
    try:
        result = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as error:
        return {"ok": False, "stdout": "", "stderr": str(error), "returncode": -1}
    return {
        "ok": result.returncode == 0,
        "stdout": result.stdout.strip(),
        "stderr": result.stderr.strip(),
        "returncode": result.returncode,
    }


def check_python_version() -> Dict[str, Any]:
    compatible = sys.version_info >= (3, 10)
    return _check(
        "Python runtime",
        compatible,
        f"Python {platform.python_version()} on {platform.system()}",
        "Python runtime is compatible." if compatible else "Install Python 3.10 or newer.",
    )


def check_environment() -> Dict[str, Any]:
    env_path = BACKEND_DIR / ".env"
    example_path = BACKEND_DIR / ".env.example"
    configured_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not example_path.exists():
        return _check("Environment configuration", False, "backend/.env.example is missing.", "Restore backend/.env.example.")
    if not env_path.exists():
        return _check("Environment configuration", False, "backend/.env is missing.", "Copy backend/.env.example to backend/.env and set OPENAI_API_KEY.")
    content = env_path.read_text(encoding="utf-8", errors="ignore")
    file_value = next((line.partition("=")[2].strip() for line in content.splitlines() if line.startswith("OPENAI_API_KEY=")), "")
    valid = bool(configured_key or (file_value and "YOUR_API_KEY" not in file_value.upper() and "PLACEHOLDER" not in file_value.upper()))
    return _check(
        "Environment configuration",
        valid,
        "backend/.env exists; API key value was not exposed." if valid else "OPENAI_API_KEY is missing or is still a placeholder.",
        "Environment is configured." if valid else "Set OPENAI_API_KEY in backend/.env.",
    )


def check_python_modules() -> List[Dict[str, Any]]:
    checks = []
    for module in REQUIRED_PYTHON_MODULES:
        available = importlib.util.find_spec(module) is not None
        checks.append(_check(f"Python module: {module}", available, "Installed." if available else "Missing.", "Module is available." if available else "Run python -m pip install -r requirements.txt."))
    optional = [module for module in OPTIONAL_PYTHON_MODULES if importlib.util.find_spec(module) is None]
    checks.append(_check(
        "Optional feature dependencies",
        True,
        "All optional voice dependencies are installed." if not optional else f"Unavailable optional modules: {', '.join(optional)}.",
        "No action is needed unless voice features are required." if optional else "Optional modules are available.",
    ))
    return checks


def check_node_environment() -> List[Dict[str, Any]]:
    node = shutil.which("node")
    npm = shutil.which("npm")
    package_json = FRONTEND_DIR / "package.json"
    node_modules = FRONTEND_DIR / "node_modules"
    return [
        _check("Node.js", bool(node), node or "node command not found.", "Node.js is available." if node else "Install Node.js LTS."),
        _check("npm", bool(npm), npm or "npm command not found.", "npm is available." if npm else "Install npm with Node.js LTS."),
        _check("Frontend manifest", package_json.is_file(), str(package_json), "Frontend manifest exists." if package_json.is_file() else "Restore frontend/package.json."),
        _check("Frontend dependencies", node_modules.is_dir(), str(node_modules), "Frontend dependencies are installed." if node_modules.is_dir() else "Run npm ci inside frontend."),
    ]


def check_repository_layout() -> List[Dict[str, Any]]:
    checks = []
    for relative in REQUIRED_FILES:
        exists = (PROJECT_ROOT / relative).is_file()
        checks.append(_check(f"Required file: {relative}", exists, str(PROJECT_ROOT / relative), "File exists." if exists else f"Restore {relative}."))
    for relative in REQUIRED_DIRECTORIES:
        exists = (PROJECT_ROOT / relative).is_dir()
        checks.append(_check(f"Required directory: {relative}", exists, str(PROJECT_ROOT / relative), "Directory exists." if exists else f"Create {relative}."))
    return checks


def check_gitignore_safety() -> Dict[str, Any]:
    path = PROJECT_ROOT / ".gitignore"
    if not path.is_file():
        return _check(".gitignore safety", False, ".gitignore is missing.", "Restore .gitignore before publishing.")
    content = path.read_text(encoding="utf-8")
    missing = [rule for rule in REQUIRED_IGNORE_RULES if rule not in content]
    return _check(
        ".gitignore safety",
        not missing,
        f"Missing rules: {', '.join(missing)}" if missing else "Environment files, dependencies, builds, and local databases are ignored.",
        "Add the missing safety rules." if missing else ".gitignore safety rules are present.",
    )


def check_backend_compile() -> Dict[str, Any]:
    files = sorted(str(path) for path in BACKEND_DIR.rglob("*.py"))
    result = _run_command([sys.executable, "-m", "py_compile", *files])
    details = result["stderr"] or result["stdout"] or f"Compiled {len(files)} Python files."
    return _check("Backend compile", result["ok"], details, "Backend Python sources compile." if result["ok"] else "Fix the reported Python syntax error.")


def check_frontend_build_script() -> Dict[str, Any]:
    path = FRONTEND_DIR / "package.json"
    if not path.is_file():
        return _check("Frontend build script", False, "frontend/package.json is missing.", "Restore the frontend manifest.")
    try:
        scripts = json.loads(path.read_text(encoding="utf-8")).get("scripts", {})
    except (OSError, json.JSONDecodeError) as error:
        return _check("Frontend build script", False, str(error), "Fix frontend/package.json.")
    available = bool(scripts.get("build"))
    return _check("Frontend build script", available, scripts.get("build", "No build script configured."), "Frontend production build is configured." if available else "Add a build script to frontend/package.json.")


def check_backend_health() -> Dict[str, Any]:
    sidecar = get_sidecar_status()
    healthy = bool(sidecar.get("port_open")) or sidecar.get("status") in {"stopped", "external_backend_detected"}
    return _check(
        "Backend health",
        healthy,
        f"Status: {sidecar.get('status', 'unknown')} | URL: {sidecar.get('backend_url', 'http://127.0.0.1:8000')}",
        "Backend state is valid." if healthy else "Start the backend with ./scripts/start_orion.sh and retry.",
    )


def run_system_doctor() -> Dict[str, Any]:
    checks = [check_python_version(), check_environment()]
    checks.extend(check_python_modules())
    checks.extend(check_node_environment())
    checks.extend(check_repository_layout())
    checks.extend([check_gitignore_safety(), check_backend_compile(), check_frontend_build_script(), check_backend_health()])
    passed = sum(check["ok"] for check in checks)
    failed = len(checks) - passed
    return {"status": "healthy" if failed == 0 else "needs_attention", "passed": passed, "failed": failed, "checks": checks}


def render_system_doctor_report(result: Optional[Dict[str, Any]] = None) -> str:
    result = result or run_system_doctor()
    lines = ["# O.R.I.O.N. System Doctor Report", "", f"Status: {result['status']}", f"Passed: {result['passed']}", f"Failed: {result['failed']}", "", "## Checks", ""]
    for check in result["checks"]:
        marker = "PASS" if check["ok"] else "CHECK"
        lines.extend([f"### {marker} — {check['name']}", "", f"- Details: {check['details']}", f"- Recommendation: {check['recommendation']}", ""])
    return "\n".join(lines)
