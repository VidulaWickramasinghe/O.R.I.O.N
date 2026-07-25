"""Read-only readiness checks for the static public demo route."""

from __future__ import annotations

import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
LANDING_DIR = PROJECT_ROOT / "backend" / "data" / "public_landing"
EXPECTED_FRONTEND_FILES = (
    "src/app/public-demo/page.tsx",
    "src/lib/publicLandingRegistry.ts",
    "src/lib/portfolioRegistry.ts",
    "src/components/public-demo/PublicHero.tsx",
    "src/components/public-demo/PublicSection.tsx",
    "src/components/public-demo/PublicFeatureCard.tsx",
    "src/components/public-demo/PublicScreenshotCard.tsx",
    "public/screenshots",
)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(content)
        temporary = Path(handle.name)
    os.replace(temporary, path)


def inspect_public_landing() -> Dict[str, Any]:
    files = [
        {
            "path": relative,
            "exists": (FRONTEND_DIR / relative).is_dir()
            if relative == "public/screenshots"
            else (FRONTEND_DIR / relative).is_file(),
        }
        for relative in EXPECTED_FRONTEND_FILES
    ]
    missing = [item for item in files if not item["exists"]]
    route_path = FRONTEND_DIR / "src" / "app" / "public-demo" / "page.tsx"
    next_config = FRONTEND_DIR / "next.config.ts"
    next_text = next_config.read_text(encoding="utf-8", errors="ignore") if next_config.is_file() else ""
    screenshot_dir = FRONTEND_DIR / "public" / "screenshots"
    screenshot_count = sum(1 for path in screenshot_dir.glob("*.png") if path.is_file()) if screenshot_dir.is_dir() else 0
    route_exists = route_path.is_file()
    static_export_ready = route_exists and 'output: "export"' in next_text
    status = "ready" if not missing and static_export_ready else "review_needed"
    return {
        "status": status,
        "generated_at": _now(),
        "route": "/public-demo",
        "files": files,
        "missing": missing,
        "missing_count": len(missing),
        "route_exists": route_exists,
        "screenshot_dir_exists": screenshot_dir.is_dir(),
        "screenshot_count": screenshot_count,
        "static_export_ready": static_export_ready,
        "safety": {
            "publishes": False,
            "pushes_to_github": False,
            "exposes_secrets": False,
            "bypasses_approvals": False,
        },
    }


def render_public_landing_report(scan: Dict[str, Any] | None = None) -> str:
    scan = scan or inspect_public_landing()
    files = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["files"])
    return f"""# O.R.I.O.N. v6.2 Public Demo Website Report

Generated: {scan['generated_at']}
Status: {scan['status']}

## Route

- Public Demo Route: {scan['route']}
- Route Exists: {scan['route_exists']}
- Static Export Configured: {scan['static_export_ready']}

## Files

{files}

## Screenshots

- Screenshot Directory Exists: {scan['screenshot_dir_exists']}
- PNG Count: {scan['screenshot_count']}

## Safety

This check is local and read-only. It does not publish, push, expose secrets, or bypass approvals.
"""


def save_public_landing_report() -> Dict[str, Any]:
    scan = inspect_public_landing()
    report = render_public_landing_report(scan)
    path = LANDING_DIR / f"PUBLIC_LANDING_REPORT_{_stamp()}.md"
    _atomic_write(path, report)
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report, "scan": scan}
