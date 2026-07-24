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
    "src/components/aurora/panels/PluginSystemPanel.tsx",
    "src/components/aurora/panels/ToolPermissionPanel.tsx",
    "src/components/aurora/panels/ToolAuditPanel.tsx",
    "src/components/aurora/panels/SecurityPolicyPanel.tsx",
    "src/components/aurora/panels/DesktopShellPanel.tsx",
    "src/components/aurora/panels/BackendSidecarPanel.tsx",
    "src/components/aurora/panels/NotificationEnginePanel.tsx",
    "src/components/aurora/panels/UserSettingsPanel.tsx",
    "src/store/auroraStore.ts",
    "src/types/panels.ts", "src/lib/panelRegistry.ts", "src/lib/panelLayoutStorage.ts",
    "src/components/aurora/panels/DashboardLayoutPanel.tsx",
    "src/components/aurora/panels/DashboardViewSelectorPanel.tsx",
    "src/types/workspaceViews.ts", "src/lib/workspaceViewStorage.ts",
]

EXPECTED_SERVICE_FILES = [
    "src/lib/api/client.ts", "src/lib/api/status.ts", "src/lib/api/dashboard.ts",
    "src/lib/api/plugins.ts", "src/lib/api/tools.ts", "src/lib/api/security.ts",
    "src/lib/api/release.ts", "src/lib/api/stabilization.ts", "src/lib/api/frontend-refactor.ts",
    "src/lib/api/desktop.ts", "src/lib/api/sidecar.ts", "src/lib/api/notifications.ts",
    "src/lib/api/settings.ts", "src/lib/api/workspaces.ts", "src/lib/api/knowledge.ts",
    "src/lib/api/vector.ts", "src/lib/api/workflows.ts", "src/lib/api/developer.ts",
]


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def inspect_frontend_architecture() -> Dict[str, Any]:
    directories = [{"path": item, "exists": (FRONTEND_DIR / item).is_dir()} for item in EXPECTED_DIRECTORIES]
    files = [{"path": item, "exists": (FRONTEND_DIR / item).is_file()} for item in EXPECTED_FILES]
    service_files = [{"path": item, "exists": (FRONTEND_DIR / item).is_file()} for item in EXPECTED_SERVICE_FILES]
    page_path = FRONTEND_DIR / "src" / "app" / "page.tsx"
    dashboard_path = FRONTEND_DIR / "src" / "components" / "aurora" / "dashboard-workspace.tsx"
    page_text = page_path.read_text(encoding="utf-8", errors="ignore") if page_path.exists() else ""
    dashboard_text = dashboard_path.read_text(encoding="utf-8", errors="ignore") if dashboard_path.exists() else ""
    component_root = FRONTEND_DIR / "src" / "components"
    components = sorted(str(path.relative_to(FRONTEND_DIR)) for path in component_root.rglob("*.tsx")) if component_root.exists() else []
    missing_dirs = [item for item in directories if not item["exists"]]
    missing_files = [item for item in files if not item["exists"]]
    missing_service_files = [item for item in service_files if not item["exists"]]
    page_lines = len(page_text.splitlines())
    dashboard_lines = len(dashboard_text.splitlines())
    orchestrator_lines = max(page_lines, dashboard_lines)
    status = "needs_refactor" if missing_dirs or missing_files or missing_service_files else "page_too_large" if orchestrator_lines > 1600 else "improving" if orchestrator_lines > 900 else "healthy"
    return {"status": status, "generated_at": _now(), "directories": directories, "files": files, "store_exists": (FRONTEND_DIR / "src/store/auroraStore.ts").is_file(), "panel_registry_exists": (FRONTEND_DIR / "src/lib/panelRegistry.ts").is_file(), "panel_storage_exists": (FRONTEND_DIR / "src/lib/panelLayoutStorage.ts").is_file(), "panel_types_exists": (FRONTEND_DIR / "src/types/panels.ts").is_file(), "dashboard_view_selector_exists": (FRONTEND_DIR / "src/components/aurora/panels/DashboardViewSelectorPanel.tsx").is_file(), "workspace_view_storage_exists": (FRONTEND_DIR / "src/lib/workspaceViewStorage.ts").is_file(),
            "missing_directories": missing_dirs, "missing_files": missing_files, "service_files": service_files, "missing_service_files": missing_service_files, "service_file_count": sum(item["exists"] for item in service_files), "page_lines": page_lines,
            "page_size": len(page_text), "dashboard_workspace_lines": dashboard_lines,
            "dashboard_workspace_size": len(dashboard_text), "component_count": len(components), "components": components}


def render_frontend_refactor_report() -> str:
    scan = inspect_frontend_architecture()
    directories = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["directories"])
    files = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["files"])
    service_lines = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["service_files"])
    components = "\n".join(f"- {item}" for item in scan["components"][:100]) or "No components found."
    return f"""# O.R.I.O.N. v4.7 Panel Groups + Workspace Views Report

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

## Dashboard Views

- Dashboard View Selector Exists: {scan['dashboard_view_selector_exists']}
- Workspace View Storage Exists: {scan['workspace_view_storage_exists']}

## Panel Registry

- Panel Registry Exists: {scan['panel_registry_exists']}
- Panel Storage Exists: {scan['panel_storage_exists']}
- Panel Types Exists: {scan['panel_types_exists']}

## Global Store

- Store Exists: {scan['store_exists']}

## API Service Layer

Service Files: {scan['service_file_count']}

{service_lines}

## Component Inventory

Component Count: {scan['component_count']}

{components}

## Refactor Guidance

- Keep page.tsx and the dashboard workspace as orchestration layers only.
- Move large panels into src/components/aurora/panels.
- Move repeated cards and buttons into src/components/aurora/ui.
- Move shared types into src/types/orion.ts and API helpers into src/lib/api.
- Avoid visual redesign during this phase.
"""


def save_frontend_refactor_report() -> Dict[str, Any]:
    report = render_frontend_refactor_report()
    path = REPORT_DIR / f"orion_v4_7_panel_groups_workspace_views_report_{datetime.now():%Y%m%d_%H%M%S}.md"
    path.write_text(report, encoding="utf-8")
    return {"status": "saved", "path": str(path), "report": report, "generated_at": _now()}
