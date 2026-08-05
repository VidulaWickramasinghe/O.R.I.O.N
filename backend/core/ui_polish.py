"""Deterministic source checks for the responsive public portfolio UI."""

from __future__ import annotations

import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
UI_POLISH_DIR = PROJECT_ROOT / "backend" / "data" / "ui_polish"
EXPECTED_FILES = (
    "src/app/public-demo/page.tsx",
    "src/components/public-demo/PublicHero.tsx",
    "src/components/public-demo/PublicSection.tsx",
    "src/components/public-demo/PublicFeatureCard.tsx",
    "src/components/public-demo/PublicScreenshotCard.tsx",
    "src/app/globals.css",
)
RESPONSIVE_MARKERS = ("sm:", "md:", "lg:", "max-w-7xl", "grid", "flex-wrap", "overflow-x")


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(content)
        temporary = Path(handle.name)
    os.replace(temporary, path)


def inspect_ui_polish() -> Dict[str, Any]:
    files = [{"path": relative, "exists": (FRONTEND_DIR / relative).is_file()} for relative in EXPECTED_FILES]
    missing = [item for item in files if not item["exists"]]
    source = "\n".join(
        (FRONTEND_DIR / relative).read_text(encoding="utf-8", errors="ignore")
        for relative in EXPECTED_FILES
        if (FRONTEND_DIR / relative).is_file()
    )
    markers = [{"marker": marker, "present": marker in source} for marker in RESPONSIVE_MARKERS]
    marker_count = sum(item["present"] for item in markers)
    mobile_ready = not missing and marker_count == len(RESPONSIVE_MARKERS)
    return {
        "status": "ready" if mobile_ready else "review_needed",
        "generated_at": _now(),
        "files": files,
        "missing": missing,
        "missing_count": len(missing),
        "responsive_markers": markers,
        "responsive_marker_count": marker_count,
        "mobile_ready": mobile_ready,
        "safety": {"frontend_only": True, "publishes": False, "pushes_to_github": False, "changes_backend_tools": False},
    }


def render_ui_polish_report(scan: Dict[str, Any] | None = None) -> str:
    scan = scan or inspect_ui_polish()
    files = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["files"])
    markers = "\n".join(f"- [{'x' if item['present'] else ' '}] {item['marker']}" for item in scan["responsive_markers"])
    return f"""# O.R.I.O.N. v6.5 UI Polish Report

Generated: {scan['generated_at']}
Status: {scan['status']}

## Files

{files}

## Responsive Markers

{markers}

- Missing Files: {scan['missing_count']}
- Mobile Ready: {scan['mobile_ready']}

## Safety

This source inspection does not publish, push, expose secrets, or alter tool behavior.
"""


def save_ui_polish_report() -> Dict[str, Any]:
    scan = inspect_ui_polish()
    report = render_ui_polish_report(scan)
    path = UI_POLISH_DIR / f"UI_POLISH_REPORT_{datetime.now():%Y%m%d_%H%M%S_%f}.md"
    _atomic_write(path, report)
    return {"status": "saved", "generated_at": _now(), "path": str(path), "report": report, "scan": scan}
