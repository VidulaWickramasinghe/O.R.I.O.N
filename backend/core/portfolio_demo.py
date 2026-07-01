import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List


BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
DEMO_DIR = BACKEND_DIR / "demo_release"

DEMO_STATE_FILE = DATA_DIR / "portfolio_demo_state.json"


DEFAULT_DEMO_STATE: Dict[str, Any] = {
    "demo_mode": False,
    "release_version": "v2.5",
    "project_name": "O.R.I.O.N.",
    "interface_name": "Aurora OS",
    "tagline": "Think. Plan. Act. Learn.",
    "last_generated_pack": "",
    "updated_at": "",
}


def get_current_timestamp() -> str:
    return datetime.now().isoformat(timespec="seconds")


def ensure_demo_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DEMO_DIR.mkdir(parents=True, exist_ok=True)


def load_demo_state() -> Dict[str, Any]:
    """
    Load portfolio demo state from disk.

    If the state file does not exist or is corrupted, a safe default state
    is returned and saved.
    """
    ensure_demo_directories()

    if not DEMO_STATE_FILE.exists():
        state = DEFAULT_DEMO_STATE.copy()
        state["updated_at"] = get_current_timestamp()
        save_demo_state(state)
        return state

    try:
        loaded_state = json.loads(DEMO_STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        state = DEFAULT_DEMO_STATE.copy()
        state["updated_at"] = get_current_timestamp()
        save_demo_state(state)
        return state

    state = DEFAULT_DEMO_STATE.copy()
    state.update(loaded_state)

    return state


def save_demo_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save portfolio demo state to disk.
    """
    ensure_demo_directories()

    DEMO_STATE_FILE.write_text(
        json.dumps(state, indent=2),
        encoding="utf-8",
    )

    return state


def update_demo_mode(enabled: bool) -> Dict[str, Any]:
    """
    Enable or disable portfolio demo mode.
    """
    state = load_demo_state()
    state["demo_mode"] = enabled
    state["updated_at"] = get_current_timestamp()

    return save_demo_state(state)


def generate_demo_readiness_report() -> str:
    """
    Generate a text readiness report for portfolio/demo presentation.
    """
    state = load_demo_state()

    demo_mode_status = "enabled" if state.get("demo_mode", False) else "disabled"

    return f"""# O.R.I.O.N. Portfolio Demo Readiness Report

## Project
{state.get("project_name", "O.R.I.O.N.")}

## Interface
{state.get("interface_name", "Aurora OS")}

## Release Version
{state.get("release_version", "v2.5")}

## Tagline
{state.get("tagline", "Think. Plan. Act. Learn.")}

## Demo Mode
Demo mode is currently {demo_mode_status}.

## Core Demo Capabilities

- AI chat console
- Project memory
- Persistent memory search
- Mission planner
- Controlled multi-step mission execution
- Mission run history
- Mission execution reports
- Command approval system
- Workspace manager
- Workspace stack detection
- GitHub release assistant
- Browser research layer
- Voice status panel
- Desktop control layer
- Portfolio release pack generation

## Safety Readiness

- Risky developer actions require approval.
- Desktop control actions require approval.
- Mission execution is controlled and logged.
- Multi-step mission mode stops on approval, completion, error, or repeated step detection.
- Activity timeline records important system events.

## Portfolio Readiness Checklist

- Backend API exposes system status.
- Aurora OS can retrieve live system modules.
- Demo mode can be enabled or disabled.
- Readiness report can be generated.
- Release pack can be generated.
- Generated files can be used for portfolio, GitHub, demo, and presentation preparation.

## Recommended Demo Flow

1. Open Aurora OS dashboard.
2. Show system status and active modules.
3. Demonstrate chat console.
4. Show memory and project context.
5. Open Mission Control.
6. Run a controlled mission step.
7. Show approval queue.
8. Demonstrate workspace summary.
9. Show browser research result.
10. Enable demo mode.
11. Generate release pack.
12. Present O.R.I.O.N. as a safe AI desktop operating layer.

## Status
Ready for controlled portfolio demonstration.
"""


def generate_demo_script() -> str:
    """
    Generate a reusable demo script for presenting O.R.I.O.N.
    """
    return """# O.R.I.O.N. Demo Script

## Product Name
O.R.I.O.N. — Operational Response and Intelligent Orchestration Network

## Interface
Aurora OS

## Tagline
Think. Plan. Act. Learn.

## Demo Opening
Welcome to O.R.I.O.N., a personal AI desktop agent designed to help users think, plan, act, and learn through a safe agentic execution system.

Aurora OS is the visual command center for O.R.I.O.N. It brings together AI chat, project memory, mission planning, workspace awareness, browser research, voice mode, approval-based actions, and portfolio release tools inside one futuristic operating-system-style dashboard.

## Demo Flow

### 1. System Status
Show the Aurora OS dashboard and confirm that the backend is online.

Highlight:
- AI Brain
- Safe Tools
- Project Memory
- Mission Control
- Workspace Manager
- Browser Research
- Desktop Control Layer
- Portfolio Release + Demo Mode

### 2. Chat Console
Send a normal request through the AI chat console and show that O.R.I.O.N. can respond with project-aware context.

### 3. Memory System
Open the memory panel and show how persistent memories can be listed and searched.

### 4. Mission Control
Show a mission with multiple steps.

Explain that O.R.I.O.N. can run controlled mission cycles safely, one step at a time or up to three controlled steps through multi-step mission mode.

### 5. Command Approval System
Show the approval queue.

Explain that risky developer or desktop actions do not execute automatically. They require approval first.

### 6. Workspace Manager
Open the workspace panel.

Show that O.R.I.O.N. can inspect a project folder, detect the tech stack, summarize the workspace, and prepare release information.

### 7. Browser Research
Use the browser research panel to inspect a public page and generate a structured research summary.

### 8. Desktop Control Layer
Show desktop actions such as:
- Open workspace in VS Code
- Open workspace folder
- Start workspace dev server
- Open approved URL in browser

Explain that these actions also pass through the approval system.

### 9. Portfolio Demo Mode
Enable demo mode from Aurora OS.

Show:
- Demo status
- Readiness report
- Release pack generation

### 10. Closing
O.R.I.O.N. is not only a chatbot. It is a safe personal AI operating layer for planning, memory, developer workflows, project execution, desktop actions, and portfolio-ready demonstrations.

## Final Line
O.R.I.O.N. helps the user think, plan, act, and learn — safely.
"""


def generate_readme_snapshot() -> str:
    """
    Generate a portfolio-ready README snapshot.
    """
    state = load_demo_state()

    return f"""# {state.get("project_name", "O.R.I.O.N.")}

## Operational Response and Intelligent Orchestration Network

**Interface:** {state.get("interface_name", "Aurora OS")}  
**Release:** {state.get("release_version", "v2.5")}  
**Tagline:** {state.get("tagline", "Think. Plan. Act. Learn.")}

---

## Overview

O.R.I.O.N. is a personal AI desktop agent designed to help users think, plan, act, and learn through a safe agentic execution system.

The project includes a futuristic web dashboard called Aurora OS, which acts as the visual command center for chat, project memory, mission planning, tool activity, system status, browser research, workspace management, desktop actions, and developer workflows.

---

## Core Features

- AI chat console
- Persistent memory
- Project memory
- Mission planner
- Controlled mission execution
- Multi-step mission mode
- Mission run history
- Mission execution reports
- Command approval system
- Workspace manager
- GitHub release assistant
- Browser research layer
- Voice mode status
- Desktop control layer
- Portfolio demo mode
- Release pack generation

---

## Safety Model

O.R.I.O.N. is designed around controlled execution.

Risky actions do not run automatically. Developer commands and desktop control actions pass through the approval system before execution.

The system records activity, mission runs, approvals, and generated release artifacts so the user can review what happened.

---

## Demo Positioning

O.R.I.O.N. is not just a chatbot. It is an AI-native operating layer for personal productivity, project execution, developer workflows, and safe agentic automation.

---

## Release Status

Portfolio demo release pack generated for {state.get("release_version", "v2.5")}.
"""


def generate_changelog_snapshot() -> str:
    """
    Generate a portfolio-ready changelog snapshot.
    """
    state = load_demo_state()

    return f"""# Changelog

## {state.get("release_version", "v2.5")} — Portfolio Release + Demo Mode

### Added

- Portfolio demo mode state management
- Demo readiness report generation
- Portfolio release pack generation
- Demo script generation
- README snapshot generation
- Changelog snapshot generation
- Demo status API support
- Demo mode toggle API support
- Release pack API support

### Improved

- Aurora OS can now display demo readiness information.
- Backend now exposes portfolio demo data for frontend integration.
- Release artifacts can be generated from the backend for portfolio presentation.

### Safety

- Demo mode does not bypass approval systems.
- Desktop actions still require approval.
- Developer commands still require approval.
- Mission execution remains controlled and logged.
"""


def generate_portfolio_summary() -> str:
    """
    Generate a concise portfolio summary for O.R.I.O.N.
    """
    state = load_demo_state()

    return f"""# Portfolio Summary

## {state.get("project_name", "O.R.I.O.N.")}

O.R.I.O.N. is a personal AI desktop agent with a futuristic dashboard called Aurora OS.

It combines AI chat, persistent memory, project context, workspace analysis, mission planning, approval-based execution, browser research, desktop control, and portfolio release tools into one safe AI operating layer.

## Key Technical Areas

- Python backend
- FastAPI API layer
- Agent tool orchestration
- SQLite-based state and memory systems
- Approval-based command execution
- Workspace inspection
- Browser research
- Desktop action routing
- Frontend dashboard integration

## Portfolio Value

This project demonstrates practical skills in:

- AI product design
- Backend API development
- Agentic workflow design
- Safety-first automation
- Developer tooling
- System architecture
- Full-stack product thinking

## Demo Tagline

{state.get("tagline", "Think. Plan. Act. Learn.")}
"""


def write_demo_file(filename: str, content: str) -> str:
    """
    Write a demo artifact file and return its path.
    """
    ensure_demo_directories()

    file_path = DEMO_DIR / filename
    file_path.write_text(content, encoding="utf-8")

    return str(file_path)


def generate_release_pack() -> Dict[str, Any]:
    """
    Generate a portfolio release pack with demo-ready artifacts.
    """
    ensure_demo_directories()

    generated_at = get_current_timestamp()

    readiness_report = generate_demo_readiness_report()
    demo_script = generate_demo_script()
    readme_snapshot = generate_readme_snapshot()
    changelog_snapshot = generate_changelog_snapshot()
    portfolio_summary = generate_portfolio_summary()

    files: List[str] = [
        write_demo_file("DEMO_READINESS_REPORT.md", readiness_report),
        write_demo_file("DEMO_SCRIPT.md", demo_script),
        write_demo_file("README_PORTFOLIO_SNAPSHOT.md", readme_snapshot),
        write_demo_file("CHANGELOG_PORTFOLIO_SNAPSHOT.md", changelog_snapshot),
        write_demo_file("PORTFOLIO_SUMMARY.md", portfolio_summary),
    ]

    manifest = {
        "status": "generated",
        "project_name": "O.R.I.O.N.",
        "interface_name": "Aurora OS",
        "release_version": "v2.5",
        "generated_at": generated_at,
        "files": files,
    }

    manifest_path = write_demo_file(
        "release_pack_manifest.json",
        json.dumps(manifest, indent=2),
    )

    files.append(manifest_path)

    state = load_demo_state()
    state["last_generated_pack"] = str(DEMO_DIR)
    state["updated_at"] = generated_at
    save_demo_state(state)

    return {
        "status": "generated",
        "generated_at": generated_at,
        "files": files,
    }


