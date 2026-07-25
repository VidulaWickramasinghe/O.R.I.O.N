"""Presentation-only portfolio showcase readiness checks."""

import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SHOWCASE_DIR = PROJECT_ROOT / "backend" / "data" / "portfolio_showcase"
SCREENSHOTS_DIR = PROJECT_ROOT / "assets" / "screenshots"
EXPECTED_SCREENSHOTS = (
    "aurora-os-dashboard.png", "dashboard-intelligence.png", "dashboard-views.png",
    "security-policy.png", "plugin-system.png", "tool-permission-enforcement.png",
    "tool-audit-center.png", "quality-gate.png", "public-release.png", "github-polish.png",
)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def inspect_portfolio_showcase() -> Dict[str, Any]:
    screenshots = [
        {"file_name": name, "path": str(SCREENSHOTS_DIR / name), "exists": (SCREENSHOTS_DIR / name).is_file()}
        for name in EXPECTED_SCREENSHOTS
    ]
    existing = (
        sorted(str(path.relative_to(PROJECT_ROOT)) for path in SCREENSHOTS_DIR.glob("*.png"))
        if SCREENSHOTS_DIR.exists()
        else []
    )
    missing = [item for item in screenshots if not item["exists"]]
    return {"status": "ready" if not missing else "screenshots_needed", "generated_at": _now(), "expected_count": len(screenshots), "existing_count": len(existing), "missing_count": len(missing), "screenshots": screenshots, "existing": existing, "missing": missing}


def render_portfolio_showcase_report(scan: Dict[str, Any] | None = None) -> str:
    scan = scan or inspect_portfolio_showcase()
    lines = "\n".join(
        f"- [{'x' if item['exists'] else ' '}] {item['file_name']}"
        for item in scan["screenshots"]
    )
    return f"""# O.R.I.O.N. v6.2 Portfolio Showcase Report

Generated: {scan['generated_at']}
Status: {scan['status']}

## Screenshot Readiness

- Expected: {scan['expected_count']}
- Existing: {scan['existing_count']}
- Missing: {scan['missing_count']}

{lines}

## Safety

Presentation-only: no push, publishing, deletion, secret exposure, or approval bypass.
"""


def save_portfolio_showcase_report() -> Dict[str, Any]:
    scan = inspect_portfolio_showcase()
    report = render_portfolio_showcase_report(scan)
    SHOWCASE_DIR.mkdir(parents=True, exist_ok=True)
    path = SHOWCASE_DIR / f"PORTFOLIO_SHOWCASE_REPORT_{datetime.now():%Y%m%d_%H%M%S_%f}.md"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=SHOWCASE_DIR, delete=False
    ) as handle:
        handle.write(report)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report, "scan": scan}
