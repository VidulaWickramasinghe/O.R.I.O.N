import platform
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List

from core.backend_sidecar import get_sidecar_status


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def run_system_doctor() -> Dict[str, Any]:
    checks: List[Dict[str, Any]] = []

    checks.append(
        {
            "name": "Python runtime",
            "ok": sys.version_info >= (3, 10),
            "details": f"Python {platform.python_version()} on {platform.system()}",
            "recommendation": "Use Python 3.10+ for O.R.I.O.N. backend services.",
        }
    )
    checks.append(
        {
            "name": "Backend package",
            "ok": (PROJECT_ROOT / "backend" / "api_main.py").exists(),
            "details": str(PROJECT_ROOT / "backend" / "api_main.py"),
            "recommendation": "Run commands from the repository root.",
        }
    )
    checks.append(
        {
            "name": "Frontend package",
            "ok": (PROJECT_ROOT / "frontend" / "package.json").exists(),
            "details": str(PROJECT_ROOT / "frontend" / "package.json"),
            "recommendation": "Install frontend dependencies before building Aurora OS.",
        }
    )
    checks.append(
        {
            "name": "Uvicorn command",
            "ok": shutil.which("uvicorn") is not None,
            "details": shutil.which("uvicorn") or "uvicorn not found on PATH",
            "recommendation": "Install backend dependencies inside .venv if uvicorn is missing.",
        }
    )

    sidecar = get_sidecar_status()
    checks.append(
        {
            "name": "Backend sidecar",
            "ok": sidecar.get("port_open", False)
            or sidecar.get("status") in ["stopped", "external_backend_detected"],
            "details": f"Status: {sidecar.get('status')} | URL: {sidecar.get('backend_url')}",
            "recommendation": "Use ./scripts/orion_desktop.sh for one-click desktop launch.",
        }
    )

    passed = sum(1 for check in checks if check["ok"])
    failed = len(checks) - passed
    return {
        "status": "pass" if failed == 0 else "attention_required",
        "passed": passed,
        "failed": failed,
        "checks": checks,
    }


def render_system_doctor_report() -> str:
    result = run_system_doctor()
    check_lines = []
    for check in result["checks"]:
        status = "PASS" if check["ok"] else "FAIL"
        check_lines.append(
            f"## {check['name']}\n\n"
            f"- Status: {status}\n"
            f"- Details: {check['details']}\n"
            f"- Recommendation: {check['recommendation']}\n"
        )
    return f"""# O.R.I.O.N. System Doctor Report

- Overall Status: {result['status']}
- Passed Checks: {result['passed']}
- Failed Checks: {result['failed']}

{chr(10).join(check_lines)}
"""
