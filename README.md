# O.R.I.O.N. — Operational Response and Intelligent Orchestration Network

**O.R.I.O.N.** is a personal AI desktop agent designed to help users think, plan, act, and learn through a safe agentic execution system.

The project includes a futuristic web dashboard called **Aurora OS**, which acts as the visual command center for chat, project memory, tool activity, system status, and developer workflows.

## Tagline

**Think. Plan. Act. Learn.**

## Current Release
**v4.3 — Frontend Component Extraction Phase 2**

## Core Capabilities

- AI chat console
- Project memory engine
- Safe developer command tools
- Notes and logs
- Voice mode
- Wake phrase mode
- Aurora OS dashboard
- Live activity timeline
- Tool-level instrumentation
- Project launcher panel
- Persistent memory database
- Memory Matrix dashboard panel
- Mission Planner System
- Structured goal and step tracking
- Controlled autonomous mission execution
- One-step mission run cycles
- Approval-aware execution loop
- Mission run history
- Mission execution reports
- Report generation for controlled mission cycles
- Project Workspace Manager
- Local project path registration
- Workspace inspection and tech stack detection
- Browser Research Layer
- Safe public webpage inspection
- Web research report saving
- Documentation research workflow
- Voice status tracking
- Aurora OS Voice Control panel
- Improved wake phrase handling
- Concise spoken replies
- Smarter context retrieval
- Automatic memory/project/workspace context injection
- Context Preview panel in Aurora OS
- Controlled multi-step mission execution
- 3-step capped autonomous mission cycles
- Approval-aware mission automation
- Approval-gated desktop control
- Open registered workspaces in VS Code
- Open workspace folders
- Open approved browser URLs
- Start workspace dev servers with approval
- Portfolio Demo Mode
- Demo readiness reporting
- Portfolio release pack generation
- Demo script and screenshot checklist generation
- Aurora OS command palette
- Ctrl/Cmd + K command launcher
- Module navigation and quick assistant commands
- Visual Mission Flow Graph
- React Flow-powered mission execution map
- Mission planner, approval gate, report, and run history visualization
- TanStack Query frontend API layer
- Shared Aurora API client
- Query-based automatic data refresh
- Cleaner frontend module architecture
- Local Knowledge Base
- Document indexing and search
- Knowledge-aware context retrieval
- Aurora OS Knowledge Base panel
- Vector Memory
- Semantic search
- Embedding-based context retrieval
- Meaning-aware memory and knowledge search
- Workflow Blueprints
- Reusable mission templates
- Blueprint-to-mission generation
- Standard release, research, bug-fix, and portfolio workflows
- Agentic Workspace Developer Mode
- Workspace inspection and diagnosis
- Approval-gated patch planning
- Developer report generation
- Safe workspace file patching with backup
- Dashboard Intelligence
- System intelligence score
- Mission and workspace analytics
- Memory, knowledge, vector, approval, and activity metrics
- Readiness recommendations
- Notification + Reminder Engine
- Local reminders
- Startup briefing
- Due task tracking
- Notification event log
- Secure local user profile settings
- Safety level configuration
- Default workspace preference
- Voice, theme, and model preferences
- Settings-aware context retrieval
- Plugin System + Tool Registry
- Plugin permissions and risk levels
- Enable/disable plugin state
- Plugin registry reports
- Modular tool architecture foundation
- Packaged desktop app shell
- Tauri desktop wrapper
- Static Aurora OS frontend export
- Desktop shell backend status
- Local desktop launch scripts
- Backend sidecar manager
- One-click desktop launch
- Sidecar status panel
- Local desktop shortcut installer
- Backend process health tracking
- Tool Permission Enforcement
- Plugin-controlled tool access
- Blocked tool logging
- Tool-to-plugin permission matrix
- High-risk tool visibility
- Tool Audit Center
- Allowed/blocked tool event history
- Security decision reports
- Expanded plugin enforcement coverage
- Audit-aware Dashboard Intelligence
- Security Policy Profiles
- Strict, Balanced, and Developer Lab risk modes
- Policy-controlled plugin states
- Security policy event history
- Risk-aware Dashboard Intelligence
- Release Candidate Manager and System Freeze
- v4.0 release checklist and local diagnostics exports
- Portfolio/demo release package generation
- Stabilization Manager
- Import/path and duplicate-risk detection
- Compile/build diagnostics and release-hardening reports
- Frontend component architecture and reusable Aurora OS panels
- Shared frontend types and API client
- Frontend refactor health scan and report export

## Frontend Refactor

O.R.I.O.N. v4.2 structurally extracts Aurora OS panels while preserving the
existing look and behavior.

```bash
curl http://127.0.0.1:8000/api/frontend/refactor
```

## Stabilization Manager

O.R.I.O.N. v4.1 adds a read-only codebase hardening workflow. It scans and
reports cleanup priorities without deleting or rewriting files.

```bash
curl -X POST http://127.0.0.1:8000/api/stabilization/scan \
  -H "Content-Type: application/json" \
  -d '{"run_build":false}'
```

## Release Candidate Manager

O.R.I.O.N. v4.0 adds a local release-readiness workflow with system freeze,
checklist status, and diagnostics package generation. System Freeze does not
push, publish, delete, or bypass approval gates.

```bash
curl http://127.0.0.1:8000/api/release-candidate/status
curl -X POST http://127.0.0.1:8000/api/release-candidate/package
```

## Security Policy Profiles

O.R.I.O.N. v3.9 applies Strict, Balanced, and Developer Lab risk modes across Plugin Registry state while preserving approval gates and audit logging.

Review and apply profiles through:

```bash
curl http://127.0.0.1:8000/api/security/policy
```

```bash
curl -X POST http://127.0.0.1:8000/api/security/policy/apply \
  -H "Content-Type: application/json" \
  -d '{"profile_key":"strict"}'
```

## Tool Audit Center

O.R.I.O.N. v3.8 records protected tool decisions locally so allowed and blocked tool events can be reviewed in Aurora OS and Dashboard Intelligence.

Review the audit stream through:

```bash
curl http://127.0.0.1:8000/api/tools/audit
```

## Tool Permission Enforcement

O.R.I.O.N. v3.7 maps selected high-impact tools to Plugin Registry entries. Disabled plugins now block mapped protected tools safely and log blocked attempts.

View the enforcement matrix in Aurora OS or through:

```bash
curl http://127.0.0.1:8000/api/tools/permissions
```

## One-Click Desktop Launch

Run the desktop launcher, which starts the local backend if needed and opens Aurora OS in the Tauri shell:

```bash
./scripts/orion_desktop.sh
```

Install the Linux desktop shortcut:

```bash
./scripts/install_linux_desktop_shortcut.sh
```


## Architecture

```text
User
↓
Aurora OS Dashboard / Terminal / Voice
↓
FastAPI Backend
↓
O.R.I.O.N. Agent Brain
↓
Safety Layer
↓
Tool Router
↓
Project Memory / Notes / Developer Tools
↓
Activity Timeline

- [Screenshot Showcase](docs/screenshot-showcase.md)

## Desktop App Shell

Run desktop development mode:

```bash
./scripts/run_desktop_dev.sh
```

Build desktop app:

```bash
./scripts/build_desktop_app.sh
```

Desktop bundle output:

```text
frontend/src-tauri/target/release/bundle/
```

## v4.3 Capabilities

- Frontend Component Extraction Phase 2
- Modular Aurora OS panel system
- Reduced dashboard orchestration complexity
- Better UI maintainability
