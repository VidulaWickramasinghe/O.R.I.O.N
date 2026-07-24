## v4.6 — Panel Registry + Customizable Dashboard Layout

### Added

- Aurora Panel Registry and layout types
- Local panel layout storage
- Dashboard Layout panel
- Panel visibility, pinning, and up/down ordering controls
- Frontend refactor scanner panel-registry checks

### Changed

- Aurora OS dashboard panels respect local registry layout preferences

### Safety

- Panel visibility is local UI state only
- Backend tool permissions and approval gates are unchanged

## v4.5 — Global Dashboard Store

### Added

- Zustand-backed global Aurora OS dashboard store
- Centralized dashboard state, loading flags, and refresh actions
- Store actions for plugins, policy, release candidate, stabilization, refactor, sidecar, notifications, and settings
- Frontend refactor scanner store detection

### Changed

- Moved major dashboard state ownership out of dashboard orchestration
- Panels receive store-backed state and actions

### Safety

- Backend behavior unchanged
- UI appearance preserved
- Refactor is structural only

## v4.4 — Frontend Service Layer + State Management Cleanup

### Added

- Frontend API service layer
- Status, dashboard, plugin, tool, security, release, stabilization, refactor, desktop, sidecar, notification, settings, and workspace services
- Service-layer scan support

### Changed

- Moved raw dashboard fetch calls into API services
- Centralized API base URL configuration

### Safety

- Backend behavior unchanged
- UI behavior preserved
- Refactor is structural only

## v4.3 — Frontend Component Extraction Phase 2

### Added

- PluginSystemPanel
- ToolPermissionPanel
- ToolAuditPanel
- SecurityPolicyPanel
- DesktopShellPanel
- BackendSidecarPanel
- NotificationEnginePanel
- UserSettingsPanel
- Updated frontend refactor scanner expectations
- v4.3 frontend component extraction documentation

### Changed

- Reduced Aurora dashboard orchestration complexity
- Continued Aurora OS component architecture migration

### Safety

- UI behavior preserved
- No backend behavior changed
- No automatic destructive actions

## v4.2 — Frontend Refactor + Component Architecture Cleanup

### Added

- Aurora OS component folders, shared API client, and shared type module
- Reusable GlassPanel, MetricCard, and StatusPill primitives
- Extracted Dashboard Intelligence, Release Candidate, and Stabilization panels
- Frontend Refactor Manager, architecture report generator, tools, and APIs
- Aurora OS Frontend Refactor health panel and documentation

### Safety

- UI appearance is preserved
- Refactor is structural, not destructive
- Dashboard orchestration remains separate from extracted presentation panels

## v4.1 — Stabilization, Bug Fixing + Codebase Cleanup

### Added

- Stabilization Manager core and local report artifacts
- Required file, import/path, duplicate-risk, and code-pattern scans
- Backend compile check and optional frontend build check
- Stabilization tools, API endpoints, Dashboard Intelligence metrics, and
  Release Candidate checklist awareness
- Aurora OS Stabilization Manager panel and documentation

### Safety

- Scan/report only; no automatic deletion or rewrite
- Real cleanup remains approval-gated

## v4.0 — Autonomous Release Candidate + System Freeze

### Added

- Release Candidate Manager and local System Freeze state
- Release Candidate SQLite database, event history, and checklist generator
- Local diagnostics package with Dashboard Intelligence, Plugin Registry, Tool
  Permission, Tool Audit, Security Policy, System Doctor, and briefing reports
- Release Candidate tools, API endpoints, Dashboard Intelligence awareness,
  and Aurora OS panel
- v4.0 release-candidate documentation

### Safety

- System Freeze is local-only and does not push, publish, delete, or modify
  external services
- Approval gates remain active
- Release packages are generated only in local data directories

## v3.9 — Security Policy Profiles + Risk Modes

### Added

- Security Policy core
- Strict, Balanced, and Developer Lab profiles
- Security policy SQLite database
- Profile application logic
- Plugin state updates from risk modes
- Security policy tools
- Security policy API endpoints
- Aurora OS Security Policy panel
- Dashboard Intelligence security policy awareness
- User Settings safety level integration
- Policy event history

### Safety

- Policy profiles do not bypass approvals
- Protected safety plugins remain enabled
- Policy changes are logged
- Strict Mode disables high-risk operational plugins

## v3.8 — Tool Permission Enforcement Expansion + Audit Center

### Added

- Tool Audit Center core
- Local tool audit SQLite database
- Allowed and blocked tool event storage
- Tool audit metrics
- Tool audit report generator
- Tool Audit tools
- Tool Audit API endpoint
- Aurora OS Tool Audit Center panel
- Dashboard Intelligence audit metrics
- Expanded enforcement to workspace, workflow, GitHub release, notification, and system doctor tools

### Safety

- Protected tool decisions are locally logged
- Blocked attempts are visible in Aurora OS
- Plugin enable/disable state now has stronger operational visibility
- Approval gates remain active

## v3.7 — Tool Permission Enforcement Layer

### Added

- Tool Permission Enforcement core
- Plugin-to-tool mapping
- Enforcement decorator
- Blocked tool response system
- Blocked tool activity logging
- Tool permission tools
- Tool permission API endpoints
- Aurora OS Tool Permission Enforcement panel
- Dashboard Intelligence tool permission metrics
- Tool Permission Enforcement plugin registry entry

### Enforced Modules

- Developer tools
- Desktop control tools
- Agentic Developer Mode tools
- Browser research tools
- Knowledge Base tools
- Vector Memory tools
- Backend Sidecar tools

### Safety

- Disabled plugins now block mapped protected tools
- Blocked attempts are logged
- Plugin Registry and core settings remain protected
- Approval gates remain active

## v3.6 — Backend Sidecar + One-Click Desktop Launch

### Added

- Backend Sidecar core
- Backend process status tracking
- Sidecar state file
- Sidecar log file
- Sidecar start/stop/restart tools
- Sidecar API endpoints
- Aurora OS Backend Sidecar panel
- One-click desktop launcher script
- Linux desktop shortcut installer
- System Doctor sidecar check
- Plugin Registry backend sidecar plugin
- Backend sidecar documentation

### Safety

- Sidecar manages only local FastAPI backend
- Backend binds to 127.0.0.1
- No approval gates are bypassed
- No arbitrary shell command execution
- Desktop app still connects to local backend only

## v3.5 — Packaged Desktop App Shell

### Added

- Tauri desktop shell
- Aurora OS packaged desktop window
- Static Next.js export configuration
- Desktop Shell backend status endpoint
- Aurora OS Desktop App Shell panel
- Desktop development launch script
- Desktop production build script
- Desktop shell documentation

### Safety

- Desktop shell is local-only
- Backend remains approval-gated
- No broad frontend filesystem permissions added
- No untrusted dynamic plugin execution
- Backend still runs locally at 127.0.0.1:8000

## v3.4 — Plugin System + Tool Registry

### Added

- Plugin Registry core
- SQLite plugin registry database
- Built-in plugin definitions
- Plugin permissions metadata
- Plugin risk levels
- Plugin enable/disable state
- Plugin metrics
- Plugin Registry tools
- Plugin Registry API endpoints
- Aurora OS Plugin System panel
- Context Engine plugin awareness
- Dashboard Intelligence plugin metrics

### Safety

- v3.4 tracks plugin metadata and plugin state only
- It does not dynamically load or execute untrusted third-party plugin code
- High-risk plugins are clearly labelled
- Plugin enable/disable state prepares the system for future tool enforcement

## v3.3 — Secure User Profiles + Settings

### Added

- Local user settings database
- User profile summary
- Display name setting
- Default workspace ID setting
- Safety level setting
- Voice mode setting
- Theme mode setting
- Preferred model setting
- Developer mode preference
- Startup briefing preference
- User settings tools
- User settings API endpoints
- Aurora OS User Profile + Settings panel
- Context Engine profile awareness
- Dashboard Intelligence settings awareness
- Startup Briefing settings awareness

### Safety

- Local preferences only
- Secrets, API keys, tokens, and passwords are not stored in user profile settings
- Safety level defaults to strict

## v3.2 — Notification + Reminder Engine

### Added

- Local Notification Engine
- SQLite reminder database
- Notification event log
- Local reminder creation
- Reminder status updates
- Due reminder refresh system
- Startup briefing generator
- Notification tools
- Notification API endpoints
- Aurora OS Notification Engine panel
- Dashboard Intelligence notification metrics

### Safety

- Local-only reminder system
- No external calendar, email, SMS, or push notification integration yet
- User remains in control of reminder completion and cancellation

## v3.1 — Visual Dashboard Intelligence

### Added

- Dashboard Intelligence core
- System intelligence score
- Mission analytics
- Workspace readiness metrics
- Memory, knowledge, and vector counts
- Approval/risk metrics
- Recent activity health metrics
- Developer report metrics
- Dashboard Intelligence API endpoint
- Aurora OS Dashboard Intelligence panel

### Purpose

- Make Aurora OS feel more like a true command center
- Provide visual readiness signals
- Give O.R.I.O.N. measurable system health
- Help prioritize next actions

## v3.0 — Agentic Workspace Developer Mode

### Added

- Developer Agent core
- Workspace development inspection
- Issue diagnosis reports
- Approval-gated patch planning
- Developer report artifacts
- Workspace file patch approval request type
- Workspace patch executor with backup creation
- Developer Agent tools
- Developer Agent API endpoints
- Aurora OS Agentic Developer Mode panel

### Safety

- No silent file edits
- Workspace patching requires manual approval
- Patch execution is restricted to registered workspace paths
- Existing files are backed up before patching
- Developer Mode generates diagnosis and patch plans before modification

## v2.9 — Workflow Templates + Mission Blueprints

### Added

- Workflow Blueprint core
- Reusable mission templates
- GitHub release workflow
- Bug fix workflow
- Research workflow
- Portfolio project workflow
- Assignment/report workflow
- Workspace development workflow
- Demo recording workflow
- System cleanup workflow
- Workflow Blueprint tools
- Workflow Blueprint API endpoints
- Aurora OS Workflow Blueprints panel

### Purpose

- Create structured missions faster
- Standardize recurring workflows
- Improve controlled automation
- Prepare O.R.I.O.N. for developer-agent workflows

## v2.8 — Vector Memory + Semantic Search

### Added

- SQLite vector memory database
- OpenAI embeddings integration
- Semantic search across persistent memory
- Semantic search across indexed knowledge documents
- Vector rebuild endpoint
- Vector search endpoint
- Aurora OS Semantic Memory panel
- Context Engine semantic retrieval integration

### Changed

- Context retrieval can now include semantic results
- O.R.I.O.N. can retrieve related information by meaning, not only exact keywords

## v2.7 — Local Knowledge Base + Document Intelligence

### Added

- Local Knowledge Base database
- Document indexing for markdown, text, JSON, CSV, code, CSS, and HTML files
- Knowledge chunk storage
- Local knowledge search
- Knowledge document summaries
- Knowledge API endpoints
- Aurora OS Knowledge Base panel
- Context Engine integration with local knowledge

### Safety

- Indexes local readable files only
- Skips common heavy folders like `.git`, `node_modules`, `.next`, `.venv`, and `__pycache__`
- Limits large file reads

## v2.6.3-D — Adaptive Aurora Layout + Dashboard Customization

### Added

- Collapsible left navigation panel
- Collapsible right context panel
- Persistent layout state using localStorage
- Dashboard widget filters
- Customisable dashboard sections
- Topbar layout toggle controls
- Improved compact sidebar state
- Fixed Mission Flow Graph custom node styling

### Changed

- Aurora OS dashboard is now more configurable
- Main dashboard modules can be shown/hidden
- Mission graph now uses custom React Flow nodes instead of default bright node wrappers


## v2.6.3-C — TanStack Query API Layer

### Added

- TanStack Query provider
- Shared Aurora API client
- Shared query hooks for status, activity, projects, workspaces, memory, missions, approvals, voice, and demo state
- Query invalidation after assistant actions
- Query-based Tools module
- Query-based Missions module

### Changed

- Core Aurora Workspace data loading now uses TanStack Query
- Reduced repeated manual frontend fetch logic
- Improved automatic refresh behavior across Aurora OS modules

## v2.6.3-B — Mission Flow Graph

### Added

- React Flow mission visualization
- Mission goal node
- Mission planner node
- Approval gate node
- Mission report node
- Recent mission run nodes
- Visual execution graph inside Missions module

### Changed

- Missions module now includes a visual mission intelligence layer
- Aurora OS mission workflow is easier to understand at a glance


## v2.6.3-A — Aurora Command Palette

### Added

- Aurora OS command palette powered by `cmdk`
- Ctrl/Cmd + K keyboard shortcut
- Navigation commands for all Aurora modules
- Assistant quick commands
- System Doctor command
- Demo Release Pack command
- Mobile command palette trigger

### Changed

- Topbar search now opens the command palette
- Aurora OS now behaves more like an intelligent operating system command environment

## v2.5 — Portfolio Release + Demo Mode

### Added

- Portfolio Demo core
- Demo state tracking
- Demo readiness report
- Portfolio case study generator
- Demo script generator
- Screenshot checklist generator
- GitHub README summary generator
- Portfolio release pack generator
- Demo Mode API endpoints
- Aurora OS Portfolio Demo Mode panel

### Purpose

- Prepare O.R.I.O.N. for GitHub presentation
- Prepare portfolio case study content
- Support demo video recording
- Package final project documentation

## v2.4 — Desktop Control Layer

### Added

- Desktop Control core
- Approval-gated VS Code workspace opening
- Approval-gated workspace folder opening
- Approval-gated browser URL opening
- Approval-gated workspace dev server start
- Desktop Control API endpoints
- Aurora OS Desktop Control panel

### Safety

- No silent desktop actions
- No uncontrolled mouse or keyboard automation
- All desktop control actions require manual approval
- Dev server startup is restricted to registered workspaces with package.json

## v2.3 — Controlled Multi-Step Mission Mode

### Added

- Controlled multi-step mission run endpoint
- Maximum 3-step execution cycle
- Aurora OS Run 3 Steps mission button
- Automatic pause when approval is required
- Automatic pause when mission completes, errors, or repeats a step

### Safety

- Multi-step mode does not bypass approval gates
- File writing and terminal commands still require approval
- Unsafe commands remain blocked
- Execution is capped at 3 steps per cycle

## v2.2 — Smarter Memory + Project Context Retrieval

### Added

- Context Engine for automatic memory/project/workspace retrieval
- Context Preview API endpoint
- Context Retrieval tool
- Aurora OS Context Retrieval panel
- Automatic context injection into API chat route
- Context-aware terminal, voice, and wake launchers

### Changed

- O.R.I.O.N. now retrieves relevant context before answering
- Responses can use persistent memory, projects, workspaces, missions, approvals, activity, and run history

## v2.1 — Voice + Wake Phrase Polish

### Added

- Voice state tracking
- Voice status API endpoint
- Voice reset API endpoint
- Aurora OS Voice Control panel
- Shortened spoken responses for better voice UX
- Improved wake phrase matching
- Sleep and shutdown command handling

### Changed

- Spoken replies are now concise by default
- Wake phrase mode now reports status into Aurora OS


## v2.0 — Browser Research + Web Automation Layer

### Added

- Playwright Chromium browser engine
- Safe public URL validation
- Web page readable text extraction
- Browser Research tools
- Browser Research API endpoints
- Aurora OS Browser Research panel
- Web research markdown artifact saving

### Safety

- Public HTTP/HTTPS pages only
- Local/private network URLs blocked
- No login automation
- No purchases
- No account changes
- No form submission automation


## v1.9 — GitHub Release Assistant

### Added

- GitHub release readiness inspection
- Git status and recent commit summary
- Release notes generator
- Release checklist generator
- Commit message suggestion tool
- GitHub Release Assistant API endpoints
- Aurora OS GitHub Release Assistant panel

### Safety

- No automatic commits
- No automatic pushes
- No GitHub publishing
- Release actions are preparation-only

## v1.8 — Project Workspace Manager

### Added

- SQLite workspace database
- Local workspace registration
- Workspace inspection tools
- Key project file reading
- Tech stack detection
- Workspace summary generation
- Workspace API endpoints
- Aurora OS Workspace Manager panel


## v1.7 — Mission Run History + Execution Reports

### Added

- SQLite mission run history database
- Mission run API endpoints
- Mission execution cycle recording
- Mission report generation endpoint
- Aurora OS Mission Run History panel
- Report button for Mission Planner cards


## v1.6 — Controlled Autonomous Mission Execution Loop

### Added

- One-step mission execution cycle
- Mission run API endpoint
- Aurora OS Run Next Step button
- Controlled autonomous workflow using existing safety tools
- Approval-aware mission execution logic

### Safety

- O.R.I.O.N. executes only one mission step per cycle
- File writing and command execution still require approval
- Unsafe commands remain blocked

## v1.5 — Command Approval System

### Added

- SQLite approval request database
- Manual approval queue
- Approval API endpoints
- Aurora OS Command Approval panel
- Approval-gated file writing
- Approval-gated safe command execution

### Changed

- `write_project_file` now creates approval requests before writing files
- `run_safe_command` now creates approval requests before executing commands


## v1.4 — Mission Planner System

### Added

- SQLite Mission Planner database
- Mission records and mission steps
- Mission Planner tools
- Mission API endpoints
- Aurora OS Mission Planner panel
- Structured goal-to-action workflow


## v1.3 — Persistent Memory Upgrade

### Added

- SQLite persistent memory database
- Persistent memory tools
- Memory API endpoints
- Aurora OS Memory Matrix panel
- Searchable long-term memory foundation


## v1.2 — UI Polish + Screenshot Showcase

### Added

- Polished Aurora OS dashboard layout
- Quick command buttons
- Improved Neural Core panel
- Improved Project Launcher styling
- Improved Activity Timeline styling
- Screenshot showcase documentation

### Changed

- Updated frontend release badge to v1.2
- Updated backend API version to v1.2

# Changelog

## v1.1 — GitHub + Portfolio Release Prep

### Added

- Portfolio project description
- Demo script
- Installation guide
- Screenshots folder
- Changelog
- License placeholder
- GitHub cleanup steps

## v1.0 — Mission Control Release

### Added

- Release-ready backend structure
- FastAPI health and mission endpoints
- Launch scripts
- README foundation
- Safety documentation
- Architecture documentation

## v0.9 — Project Launcher Panel

### Added

- Project launcher API
- Project cards in Aurora OS
- Selected project prompt workflow

## v0.8 — Tool-Level Instrumentation

### Added

- Tool start logging
- Tool completion logging
- Tool error logging

## v0.7 — Live Activity Timeline

### Added

- Activity timeline backend
- Activity API endpoint
- Live timeline frontend panel

## v0.6 — Aurora OS Dashboard

### Added

- Next.js dashboard
- FastAPI bridge
- AI chat console
- Neural core interface

## v0.5 — Wake Phrase Mode

### Added

- “Hey Orion” wake phrase flow
- Wake mode launcher

## v0.4 — Voice Mode

### Added

- Voice recording
- Speech transcription
- Text-to-speech response

## v0.3 — Safe Developer Command Center

### Added

- Safe file reading
- Safe generated file writing
- Approved command execution
- Dangerous command blocking

## v0.2 — Project Command Center

### Added

- Project registration
- Project listing
- Project notes
- Roadmap saving
- Portfolio summary saving

## v0.1 — O.R.I.O.N. Core

### Added

- Terminal AI assistant
- Safe notes
- Activity log
- SQLite session memory
