"""Read-only Aurora OS component-architecture health reporting."""

from datetime import datetime
import os
from pathlib import Path
import tempfile
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
    "src/components/aurora/resilience/PanelErrorBoundary.tsx", "src/components/aurora/resilience/OfflineBanner.tsx",
    "src/components/aurora/resilience/LoadingSkeleton.tsx", "src/components/aurora/resilience/PanelFallback.tsx",
    "src/lib/api/quality-gate.ts",
    "src/lib/api/github-polish.ts",
    "src/types/portfolio.ts", "src/lib/portfolioRegistry.ts", "src/lib/api/portfolio-showcase.ts",
    "src/components/aurora/panels/ScreenshotGalleryPanel.tsx", "src/components/aurora/panels/PortfolioCaseStudyPanel.tsx", "src/components/aurora/panels/PortfolioDemoPanel.tsx", "src/components/aurora/panels/PortfolioShowcaseStatusPanel.tsx",
    "src/components/aurora/panels/GitHubPolishPanel.tsx",
    "src/types/workspaceViews.ts", "src/lib/workspaceViewStorage.ts",
    "src/app/public-demo/page.tsx", "src/lib/publicLandingRegistry.ts",
    "src/components/public-demo/PublicHero.tsx", "src/components/public-demo/PublicSection.tsx",
    "src/components/public-demo/PublicFeatureCard.tsx", "src/components/public-demo/PublicScreenshotCard.tsx",
    "src/lib/api/public-landing.ts", "src/components/aurora/panels/PublicLandingPanel.tsx",
    "src/lib/api/ui-polish.ts", "src/components/aurora/panels/UIPolishPanel.tsx",
    "src/lib/api/github-launch.ts", "src/components/aurora/panels/GitHubLaunchPanel.tsx",
    "src/lib/api/final-launch.ts", "src/components/aurora/panels/FinalLaunchPanel.tsx",
    "src/types/recording.ts", "src/lib/recordingRegistry.ts", "src/lib/recordingModeStorage.ts", "src/components/aurora/panels/PresenterControlsPanel.tsx", "src/components/aurora/resilience/RecordingModeOverlay.tsx",
    "src/types/demo.ts", "src/lib/demoWalkthroughRegistry.ts", "src/lib/demoWalkthroughStorage.ts", "src/lib/demoData.ts",
    "src/components/aurora/panels/GuidedWalkthroughPanel.tsx", "src/components/aurora/resilience/DemoCalloutOverlay.tsx",
]

EXPECTED_SERVICE_FILES = [
    "src/lib/api/client.ts", "src/lib/api/status.ts", "src/lib/api/dashboard.ts",
    "src/lib/api/plugins.ts", "src/lib/api/tools.ts", "src/lib/api/security.ts",
    "src/lib/api/release.ts", "src/lib/api/stabilization.ts", "src/lib/api/frontend-refactor.ts",
    "src/lib/api/desktop.ts", "src/lib/api/sidecar.ts", "src/lib/api/notifications.ts",
    "src/lib/api/settings.ts", "src/lib/api/workspaces.ts", "src/lib/api/knowledge.ts",
    "src/lib/api/vector.ts", "src/lib/api/workflows.ts", "src/lib/api/developer.ts", "src/lib/api/github-polish.ts",
    "src/lib/api/demo.ts", "src/lib/api/browser.ts", "src/lib/api/memory.ts",
    "src/lib/api/voice.ts",
]

EXPECTED_STORE_ACTIONS = (
    "refreshAll:",
    "loadPanelLayout:",
    "togglePanelVisibility:",
    "togglePanelPinned:",
    "movePanelUp:",
    "movePanelDown:",
    "resetPanelLayout:",
)


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
    store_path = FRONTEND_DIR / "src" / "store" / "auroraStore.ts"
    store_text = store_path.read_text(encoding="utf-8", errors="ignore") if store_path.exists() else ""
    component_root = FRONTEND_DIR / "src" / "components"
    components = sorted(str(path.relative_to(FRONTEND_DIR)) for path in component_root.rglob("*.tsx")) if component_root.exists() else []
    missing_dirs = [item for item in directories if not item["exists"]]
    missing_files = [item for item in files if not item["exists"]]
    missing_service_files = [item for item in service_files if not item["exists"]]
    github_launch_panel_exists = (FRONTEND_DIR / "src/components/aurora/panels/GitHubLaunchPanel.tsx").exists()
    github_launch_service_exists = (FRONTEND_DIR / "src/lib/api/github-launch.ts").exists()
    final_launch_panel_exists = (FRONTEND_DIR / "src/components/aurora/panels/FinalLaunchPanel.tsx").exists()
    final_launch_service_exists = (FRONTEND_DIR / "src/lib/api/final-launch.ts").exists()
    recording_types_exists = (FRONTEND_DIR / "src/types/recording.ts").exists()
    recording_registry_exists = (FRONTEND_DIR / "src/lib/recordingRegistry.ts").exists()
    recording_storage_exists = (FRONTEND_DIR / "src/lib/recordingModeStorage.ts").exists()
    presenter_controls_panel_exists = (FRONTEND_DIR / "src/components/aurora/panels/PresenterControlsPanel.tsx").exists()
    recording_overlay_exists = (FRONTEND_DIR / "src/components/aurora/resilience/RecordingModeOverlay.tsx").exists()
    demo_types_exists = (FRONTEND_DIR / "src/types/demo.ts").exists()
    demo_registry_exists = (FRONTEND_DIR / "src/lib/demoWalkthroughRegistry.ts").exists()
    demo_storage_exists = (FRONTEND_DIR / "src/lib/demoWalkthroughStorage.ts").exists()
    guided_walkthrough_panel_exists = (FRONTEND_DIR / "src/components/aurora/panels/GuidedWalkthroughPanel.tsx").exists()
    demo_callout_overlay_exists = (FRONTEND_DIR / "src/components/aurora/resilience/DemoCalloutOverlay.tsx").exists()
    page_lines = len(page_text.splitlines())
    dashboard_lines = len(dashboard_text.splitlines())
    orchestrator_lines = max(page_lines, dashboard_lines)
    missing_store_actions = [action for action in EXPECTED_STORE_ACTIONS if action not in store_text]
    store_direct_fetch_count = store_text.count("fetch(")
    store_hardcoded_api_count = store_text.count("http://127.0.0.1:8000")
    store_healthy = bool(store_text) and not missing_store_actions and not store_direct_fetch_count and not store_hardcoded_api_count
    panel_boundary_count = dashboard_text.count("<SafePanel ")
    resilience_files_ready = all((FRONTEND_DIR / path).is_file() for path in ["src/components/aurora/resilience/PanelErrorBoundary.tsx", "src/components/aurora/resilience/OfflineBanner.tsx", "src/components/aurora/resilience/LoadingSkeleton.tsx", "src/components/aurora/resilience/PanelFallback.tsx"])
    resilience_ready = resilience_files_ready and panel_boundary_count > 0 and "<OfflineBanner " in dashboard_text
    status = "needs_refactor" if missing_dirs or missing_files or missing_service_files or not store_healthy or not resilience_ready else "page_too_large" if orchestrator_lines > 1600 else "improving" if orchestrator_lines > 900 else "healthy"
    return {"status": status, "generated_at": _now(), "directories": directories, "files": files, "store_exists": store_path.is_file(), "store_healthy": store_healthy, "store_line_count": len(store_text.splitlines()), "missing_store_actions": missing_store_actions, "store_direct_fetch_count": store_direct_fetch_count, "store_hardcoded_api_count": store_hardcoded_api_count, "panel_registry_exists": (FRONTEND_DIR / "src/lib/panelRegistry.ts").is_file(), "panel_storage_exists": (FRONTEND_DIR / "src/lib/panelLayoutStorage.ts").is_file(), "panel_types_exists": (FRONTEND_DIR / "src/types/panels.ts").is_file(), "dashboard_view_selector_exists": (FRONTEND_DIR / "src/components/aurora/panels/DashboardViewSelectorPanel.tsx").is_file(), "github_polish_panel_exists": (FRONTEND_DIR / "src/components/aurora/panels/GitHubPolishPanel.tsx").is_file(), "github_polish_service_exists": (FRONTEND_DIR / "src/lib/api/github-polish.ts").is_file(), "workspace_view_storage_exists": (FRONTEND_DIR / "src/lib/workspaceViewStorage.ts").is_file(), "resilience_file_count": sum((FRONTEND_DIR / path).is_file() for path in ["src/components/aurora/resilience/PanelErrorBoundary.tsx", "src/components/aurora/resilience/OfflineBanner.tsx", "src/components/aurora/resilience/LoadingSkeleton.tsx", "src/components/aurora/resilience/PanelFallback.tsx"]), "panel_boundary_count": panel_boundary_count, "resilience_ready": resilience_ready,
            "missing_directories": missing_dirs, "missing_files": missing_files, "service_files": service_files, "missing_service_files": missing_service_files, "service_file_count": sum(item["exists"] for item in service_files), "page_lines": page_lines,
            "page_size": len(page_text), "dashboard_workspace_lines": dashboard_lines,
            "dashboard_workspace_size": len(dashboard_text), "component_count": len(components), "components": components, "github_launch_panel_exists": github_launch_panel_exists, "github_launch_service_exists": github_launch_service_exists, "final_launch_panel_exists": final_launch_panel_exists, "final_launch_service_exists": final_launch_service_exists, "recording_types_exists": recording_types_exists, "recording_registry_exists": recording_registry_exists, "recording_storage_exists": recording_storage_exists, "presenter_controls_panel_exists": presenter_controls_panel_exists, "recording_overlay_exists": recording_overlay_exists, "demo_types_exists": demo_types_exists, "demo_registry_exists": demo_registry_exists, "demo_storage_exists": demo_storage_exists, "guided_walkthrough_panel_exists": guided_walkthrough_panel_exists, "demo_callout_overlay_exists": demo_callout_overlay_exists}


def render_frontend_refactor_report(scan: Dict[str, Any] | None = None) -> str:
    scan = scan or inspect_frontend_architecture()
    directories = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["directories"])
    files = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["files"])
    service_lines = "\n".join(f"- [{'x' if item['exists'] else ' '}] {item['path']}" for item in scan["service_files"])
    components = "\n".join(f"- {item}" for item in scan["components"][:100]) or "No components found."
    return f"""# O.R.I.O.N. v6.2 Frontend Service Architecture Report

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

## Frontend Resilience

- Resilience Files: {scan['resilience_file_count']}
- Isolated Panels: {scan.get('panel_boundary_count', 0)}
- Resilience Ready: {scan['resilience_ready']}

## GitHub Polish

- GitHub Polish Panel Exists: {scan['github_polish_panel_exists']}
- GitHub Polish Service Exists: {scan['github_polish_service_exists']}

## Final Launch

- Final Launch Panel Exists: {scan['final_launch_panel_exists']}
- Final Launch Service Exists: {scan['final_launch_service_exists']}

## Demo Recording Mode

- Recording Types Exists: {scan['recording_types_exists']}
- Recording Registry Exists: {scan['recording_registry_exists']}
- Recording Storage Exists: {scan['recording_storage_exists']}
- Presenter Controls Panel Exists: {scan['presenter_controls_panel_exists']}
- Recording Overlay Exists: {scan['recording_overlay_exists']}

## Demo Walkthrough

- Demo Types Exists: {scan['demo_types_exists']}
- Demo Registry Exists: {scan['demo_registry_exists']}
- Demo Storage Exists: {scan['demo_storage_exists']}
- Guided Walkthrough Panel Exists: {scan['guided_walkthrough_panel_exists']}
- Demo Callout Overlay Exists: {scan['demo_callout_overlay_exists']}

## Dashboard Views

- Dashboard View Selector Exists: {scan['dashboard_view_selector_exists']}
- Workspace View Storage Exists: {scan['workspace_view_storage_exists']}

## Panel Registry

- Panel Registry Exists: {scan['panel_registry_exists']}
- Panel Storage Exists: {scan['panel_storage_exists']}
- Panel Types Exists: {scan['panel_types_exists']}

## Global Store

- Store Exists: {scan['store_exists']}
- Store Healthy: {scan['store_healthy']}
- Store Lines: {scan['store_line_count']}
- Missing Store Actions: {len(scan['missing_store_actions'])}
- Direct Fetch Calls: {scan['store_direct_fetch_count']}
- Hardcoded API URLs: {scan['store_hardcoded_api_count']}

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
    scan = inspect_frontend_architecture()
    report = render_frontend_refactor_report(scan)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / (
        f"orion_v4_2_frontend_refactor_report_{datetime.now():%Y%m%d_%H%M%S_%f}.md"
    )
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=REPORT_DIR, delete=False
    ) as handle:
        handle.write(report)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)
    return {
        "status": "saved",
        "path": str(path),
        "report": report,
        "scan": scan,
        "generated_at": _now(),
    }
