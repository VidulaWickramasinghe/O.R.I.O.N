"""Presentation-only portfolio showcase readiness checks."""
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SHOWCASE_DIR = PROJECT_ROOT / "backend" / "data" / "portfolio_showcase"
SCREENSHOTS_DIR = PROJECT_ROOT / "assets" / "screenshots"
SHOWCASE_DIR.mkdir(parents=True, exist_ok=True)
EXPECTED_SCREENSHOTS = ["aurora-os-dashboard.png", "dashboard-intelligence.png", "dashboard-views.png", "security-policy.png", "plugin-system.png", "tool-permission-enforcement.png", "tool-audit-center.png", "quality-gate.png", "public-release.png", "github-polish.png"]
def _now() -> str: return datetime.now().isoformat(timespec="seconds")
def inspect_portfolio_showcase() -> Dict[str, Any]:
    shots = [{"file_name": name, "path": str(SCREENSHOTS_DIR / name), "exists": (SCREENSHOTS_DIR / name).is_file()} for name in EXPECTED_SCREENSHOTS]
    existing = sorted(str(path.relative_to(PROJECT_ROOT)) for path in SCREENSHOTS_DIR.glob("*.png")) if SCREENSHOTS_DIR.exists() else []
    missing = [item for item in shots if not item["exists"]]
    return {"status": "ready" if not missing else "screenshots_needed", "generated_at": _now(), "expected_count": len(shots), "existing_count": len(existing), "missing_count": len(missing), "screenshots": shots, "existing": existing, "missing": missing}
def render_portfolio_showcase_report() -> str:
    scan=inspect_portfolio_showcase(); lines="\n".join(f"- [{'x' if item['exists'] else ' '}] {item['file_name']}" for item in scan['screenshots'])
    return f"# O.R.I.O.N. v5.2 Portfolio Showcase Report\n\nGenerated: {scan['generated_at']}\nStatus: {scan['status']}\n\n## Screenshot Readiness\n\n- Expected: {scan['expected_count']}\n- Existing: {scan['existing_count']}\n- Missing: {scan['missing_count']}\n\n{lines}\n\n## Safety\n\nPresentation-only: no push, publishing, deletion, secret exposure, or approval bypass.\n"
def save_portfolio_showcase_report() -> Dict[str, Any]:
    path=SHOWCASE_DIR / f"PORTFOLIO_SHOWCASE_REPORT_{datetime.now():%Y%m%d_%H%M%S}.md"; report=render_portfolio_showcase_report(); path.write_text(report, encoding="utf-8")
    return {"status":"saved", "generated_at":_now(), "path":str(path), "report":report}
