"""Read-only Aurora OS component-architecture health reporting."""

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"
REPORT_DIR = PROJECT_ROOT / "backend" / "data" / "frontend_refactor_reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

EXPECTED_DIRECTORIES = [
    "src/components/aurora", "src/components/aurora/panels", "src/components/aurora/layout",
    "src/components/aurora/ui", "src/lib", "src/lib/api", "src/types",
]
EXPECTED_FILES = [
    "src/lib/api/client.ts", "src/lib/format.ts", "src/types/orion.ts",
    "src/components/aurora/ui/GlassPanel.tsx", "src/components/aurora/ui/MetricCard.tsx",
    "src/components/aurora/ui/StatusPill.tsx", "src/components/aurora/panels/DashboardIntelligencePanel.tsx",
    "src/components/aurora/panels/ReleaseCandidatePanel.tsx", "src/components/aurora/panels/StabilizationPanel.tsx",
    "src/components/aurora/panels/FrontendRefactorPanel.tsx",
]


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def inspect_frontend_architecture() -> Dict[str, Any]:
    directories = [{"path": item, "exists": (FRONTEND_DIR / item).is_dir()} for item in EXPECTED_DIRECTORIES]
    files = [{"path": item, "exists": (FRONTEND_DIR / item).is_file()} for item in EXPECTED_FILES]
    page_path = FRONTEND_DIR / "src" / "app" / "page.tsx"
    dashboard_path = FRONTEND_DIR / "src" / "components" / "aurora" / "dashboard-workspace.tsx"
    page_text = page_path.read_text(encoding="utf-8", errors="ignore") if page_path.exists() else ""
    dashboard_text = dashboard_path.read_text(encoding="utf-8", errors="ignore") if dashboard_path.exists() else ""
    component_root = FRONTEND_DIR / "src" / "components"
    components = sorted(str(path.relative_to(FRONTEND_DIR)) for path in component_root.rglob("*.tsx")) if component_root.exists() else []
    missing_dirs = [item for item in directories if not item["exists"]]
    missing_files = [item for item in files if not item["exists"]]
    page_lines = len(page_text.splitlines())
    dashboard_lines = len(dashboard_text.splitlines())
    orchestrator_lines = max(page_lines, dashboard_lines)
    status = "needs_refactor" if missing_dirs or missing_files else "page_too_large" if orchestrator_lines > 1600 else "improving" if orchestrator_lines > 900 else "healthy"
    return {"status": status, "generated_at": _now(), "directories": directories, "files": files,
            "missing_directories": missing_dirs, "missing_files": missing_files, "page_lines": page_lines,
            "page_size": len(page_text), "dashboard_workspace_lines": dashboard_lines,
            "dashboard_workspace_size": len(dashboard_text), "component_count": len(components), "components": components}


def render_frontend_refactor_report() -> str:
    scan = inspect_frontend_architecture()
    directories = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["directories"])
    files = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["files"])
    components = "\n".join(f"- {item}" for item in scan["components"][:100]) or "No components found."
    return f"""# O.R.I.O.N. v4.2 Frontend Refactor Report

Generated: {scan['generated_at']}
Status: {scan['status']}

## page.tsx Health

- Lines: {scan['page_lines']}
- Size: {scan['page_size']} characters
- Dashboard workspace lines: {scan['dashboard_workspace_lines']}
- Dashboard workspace size: {scan['dashboard_workspace_size']} characters

## Expected Directories

{directories}

## Expected Files

{files}

## Component Inventory

Component Count: {scan['component_count']}

{components}

## Refactor Guidance

- Keep page.tsx as the orchestration layer only.
- Move large panels into src/components/aurora/panels.
- Move repeated cards and buttons into src/components/aurora/ui.
- Move shared types into src/types/orion.ts and API helpers into src/lib/api.
- Avoid visual redesign during this phase.
"""


def save_frontend_refactor_report() -> Dict[str, Any]:
    report = render_frontend_refactor_report()
    path = REPORT_DIR / f"orion_v4_2_frontend_refactor_report_{datetime.now():%Y%m%d_%H%M%S}.md"
    path.write_text(report, encoding="utf-8")
    return {"status": "saved", "path": str(path), "report": report, "generated_at": _now()}
