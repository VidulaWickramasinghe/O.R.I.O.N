## v6.5.1 — Dashboard Runtime & Stability Patch

### Fixed

- Fixed the Tool Permissions API response contract so permission-matrix responses include the required allowed, blocked, and reason fields.
- Fixed the Live Context panel so it can be opened, closed, and persisted correctly while allowing the dashboard to reclaim available space.
- Connected Aurora OS display name and role title to live backend user settings.
- Added functional workspace and environment selectors backed by registered workspaces and persistent settings.
- Fixed SQLite plugin-registry contention by adding bounded busy waits, idempotent initialization, and reduced unnecessary registry writes.
- Connected the topbar Safety control to the real Security Policy backend.
- Added confirmation before switching to less restrictive security profiles while preserving approval enforcement.
- Replaced hardcoded shell identity and mission indicators with backend-driven state.
- Added time-aware dashboard greetings.
- Connected the profile footer to User Settings.
- Added generated mission and stabilization report paths to repository hygiene rules.

### Improved

- Strengthened SQLite runtime stability under concurrent dashboard requests.
- Improved Aurora OS shell consistency so visible interactive controls correspond to real functionality.
- Added regression coverage for tool permissions, Live Context, user profile settings, workspace/environment controls, security profiles, SQLite registry behavior, and shell-state integration.
- Improved runtime artifact hygiene for generated local reports.

### Verified

- Backend regression suite: **75/75 tests passed**.
- Tool Permissions API returns HTTP 200 with the required response contract.
- Local CORS supports both `http://localhost:3000` and `http://127.0.0.1:3000`.
- Security profiles remain approval-gated.
- Stable v6.5.0 release baseline remains unchanged.

### Safety

- Approval gates remain enforced.
- Protected safety plugins remain protected.
- Security-profile changes do not bypass approval enforcement.
- Release tooling remains local-first and does not automatically push, publish, delete repository content, or expose secrets.

## v6.5 — Safety Review Board + Feature Approval Workflow

### Added

- Safety Review Board and feature approval workflow for governed future development.
- Public handoff documentation for the O.R.I.O.N. v6.5 release baseline.
- Public-facing Aurora OS release presentation, repository metadata, and launch readiness documentation.
- Stable release, production readiness, final launch, and GitHub launch verification workflows.

### Improved

- Aurora OS backend-connected operational workspaces across missions, memory, tools, browser research, voice, projects, analytics, agents, settings, demo, and portfolio views.
- Repository release hygiene for generated runtime and release artifacts.
- Production Readiness now evaluates the complete release checklist correctly.

### Verified

- Production Readiness: `production_ready` — 100%, 15/15 checks.
- Stable Release: `stable_release_ready` — 6/6 checks.
- Final Launch: `launch_ready` — 11/11 checks.
- GitHub Launch: `github_ready` — 9/9 checks.
- Release Verification: 5/5 checks passed.
- Backend regression suite: 66 tests passed.
- Aurora OS production build completed successfully with 23 static routes generated.

### Safety

- O.R.I.O.N. remains local-first and user-controlled.
- Risky tool and desktop actions remain approval-gated.
- Release tooling does not automatically push code, publish releases, expose secrets, delete repository content, or bypass approvals.

## v6.2 — Frontend Service Layer Completion

### Improved

- Centralized the remaining active Demo, Browser Research, Memory, Context Preview,
  Voice, and Workspace Desktop requests under `frontend/src/lib/api`.
- Removed the second hardcoded Aurora API client and made legacy module consumers
  delegate to the shared configurable client.
- Added root-relative path validation, bounded backend error details, trailing-slash
  normalization, and HTTP 204 handling to the shared API client.
- Expanded Frontend Refactor service checks to cover the newly centralized modules
  and corrected the report identity to the current v6.2 architecture line.

### Safety

- UI behavior and backend routes are unchanged; this is a frontend communication
  and maintainability hardening pass.

## v6.2 — Stabilization and Frontend Scanner Accuracy

### Fixed

- Stabilization scans reuse their collected checks when building cleanup
  checklists and reports instead of repeating filesystem scans or frontend builds.
- Cached stabilization results are synchronized and defensively copied so API
  consumers cannot mutate later diagnostic responses.
- Backend compilation uses the active Python interpreter, and import-style checks
  use the Python AST instead of matching documentation strings.
- Corrected two inconsistent `backend.core` imports to the runtime `core` style.
- Stabilization and frontend-refactor reports now use collision-safe filenames and
  atomic writes, and saved-report API responses reuse the exact saved scan.
- Corrected the Frontend Refactor report title and artifact prefix, which
  incorrectly identified the report as unrelated v5.x launch output.

### Tests

- Added regression coverage for cache isolation, single-snapshot report rendering,
  syntax-aware import scanning, and Frontend Refactor report identity.

## v6.2 — Security Policy and Release Freeze Integrity

### Improved

- Strict security profiles now fail closed for newly registered, non-protected
  plugins instead of leaving unknown capabilities enabled.
- Security profile application validates inputs and compensates plugin, setting,
  policy-state, and policy-event changes when audit persistence fails.
- New policy databases default to Strict Mode, matching the default user safety
  setting instead of reporting a contradictory Balanced Mode state.
- Security policy and release candidate API reports now share the same snapshots
  as their returned state, event, and checklist data.
- Release candidate packages require an active system freeze, use collision-safe
  microsecond timestamps, and write artifacts atomically.
- Release freeze metadata and locally stored release events are validated and
  bounded, and missing security profile routes now return HTTP 404.

### Tests

- Added regression coverage for strict-mode handling of future plugins, failed
  policy-audit rollback, freeze-gated packaging, and release metadata bounds.

## v6.2 — Tool Enforcement and Audit Integrity

### Improved

- Unmapped tool names are denied by default instead of being reported as allowed.
- Protected tool execution now fails closed when its required audit event cannot
  be persisted.
- Tool audit inputs, decision filters, and query limits are validated and bounded.
- Audit metrics use database aggregates across the complete event history rather
  than silently counting only the newest 1,000 records.
- Permission and audit API responses render metrics, rows, and reports from one
  consistent snapshot.

### Tests

- Added regression coverage for fail-closed unmapped tools, audit-storage failure,
  invalid audit decisions, and complete-history audit totals.

## v6.2 — Plugin Registry and Desktop Sidecar Safety

### Improved

- Added the missing built-in Plugin Registry metadata entry and prevented core
  approval, registry, enforcement, audit, and security-policy plugins from being
  disabled through metadata controls.
- Hardened backend sidecar state persistence with atomic writes and recovery from
  malformed state files.
- Restricted sidecar startup to loopback interfaces and valid TCP ports.
- Added process identity verification before stopping a stored PID, preventing a
  stale or altered state file from terminating an unrelated process.
- Prevented sidecar restart from continuing after a blocked stop operation and
  avoided attempting to stop the API process before its own response is returned.

### Tests

- Added regression coverage for plugin state preservation, protected safety
  plugins, loopback-only sidecar startup, and stale-PID termination protection.

## v6.2 — Dashboard, Reminder, and Profile Safety Hardening

### Improved

- Dashboard Intelligence now renders one consistent analytics snapshot and tolerates invalid mission/workspace metadata.
- Reminder timestamps are normalized to UTC, relative times must be positive, due refreshes are idempotent, and completed/cancelled reminders are terminal.
- Reminder and settings API payloads now have explicit size and value constraints, with missing reminders returning HTTP 404.
- Default workspace preferences must reference a registered workspace, while display names reject multiline and secret-like values.
- Installation documentation now uses `~/O.R.I.O.N/` and the canonical `VidulaWickramasinghe/O.R.I.O.N` GitHub repository.

## v6.2 — Semantic, Workflow, and Developer Safety Hardening

### Improved

- Vector embeddings now resolve credentials at call time and rebuilds report partial or failed indexing accurately.
- Workflow missions reject unknown workspace identifiers instead of creating unusable plans.
- Developer patch paths use path-aware containment checks, validate payload sizes and reasons, and write atomically.
- Approved file patches preserve uniquely timestamped backups and cannot be replayed after processing.
- Backend regression tests now cover semantic configuration, rebuild status, workflow validation, and patch safety.

## v6.2 — Production Hardening + Knowledge Validation

### Added

- One-command setup, diagnostics, and combined startup scripts.
- Comprehensive System Doctor checks for environment, dependencies, repository layout, backend compilation, frontend build configuration, `.gitignore` safety, and backend state.
- Live `/api/system/doctor` endpoint and upgraded Aurora OS Production Health module.
- Release hardening checklist documenting the local validation workflow.

### Verified

- Local Knowledge Base indexing, search, API routes, dashboard panel, and context-engine integration remain enabled in the v6.2 release line.
- System Doctor reports never expose the configured API key value.

## v6.2 — Patch Release Manager + Hotfix Workflow

### Added

- Local patch workflow state, patch candidate classifier, hotfix checklist, patch notes, reports, and package artifacts.
- Patch Release plugin and permission-aware agent tools.

### Safety

- Local planning and artifact generation only: no GitHub issue edits, pushes, publishing, deletions, or approval bypasses.

## v6.1 — Post-Release Maintenance + Issue Triage Mode

- Added local issue triage, known issues, patch planning, and maintenance reporting.

## v6.0 — Stable Public Release + Version Lock

- Added local stable-release lock, checklist, reports, changelog, workflow, and package preparation.

## v5.9 — Production Readiness Snapshot + Final Release Candidate v2

- Added combined local production readiness verification and Final Release Candidate v2 generation.

## v5.8 — Final UI Polish + Mobile Responsive Showcase

- Added responsive public-demo components and UI polish readiness reporting.

## v5.7 — Public Demo Website + Landing Page Export

- Added public demo route, landing readiness core, and static-export checks.
- Safety: no publishing, GitHub push, secret exposure, or approval bypass.

## v5.6 — GitHub Launch Assistant + Release Draft Prep

- Added local release drafts, badges, templates, safe-push checklist, and launch artifacts.
- Safety: no push, publishing, deletion, secret exposure, or approval bypass.

## v5.5 — Final Public Launch Checklist + Repository Freeze

- Added final launch checks, repository freeze state, reports, package generation, API, and Aurora panel.
- Safety: no push, publishing, deletion, secret exposure, or approval bypass.

## v5.4 — Demo Recording Mode + Presenter Controls

### Added
- Recording mode state, scene presets, presenter controls, overlay, timer, checklist, and clean layout controls
- Recording readiness core, API, tools, plugin integration, and scanner checks

### Safety
- Presentation-only; no automatic screen recording, publishing, tool execution, or approval bypass

## v5.3 — Demo Data Mode + Guided Portfolio Walkthrough

### Added

- Demo walkthrough types, registry, local storage, and sample data foundation
- Guided Walkthrough panel, floating demo callout overlay, and progress controls
- Demo walkthrough backend core, tools, API endpoints, plugin integration, and scanner checks

### Safety

- Presentation-only; no automatic tool execution, publishing, deletion, secret exposure, or approval bypass

## v5.2 — Screenshot Gallery + Portfolio Case Study Page

### Added

- Portfolio screenshot metadata registry and gallery panel
- Portfolio case study and public demo narrative panels
- Presentation-only screenshot readiness core, tools, and API endpoints
- Portfolio showcase frontend API service and documentation

### Safety

- Presentation-only: no push, publishing, deletion, secret exposure, or approval bypass

## v5.1 — GitHub Repository Polish + Portfolio Launch Prep

### Added

- Local GitHub repository-polish checks and launch-prep reports
- Screenshot readiness, `.gitignore`, and non-disclosing secret-pattern checks
- GitHub description/topics, portfolio case study, and final commit plan assets
- GitHub Polish API service and Aurora panel component

### Safety

- No GitHub push or release publishing
- No automatic deletion or approval bypass
- Secret values are never reported

## v5.0 — Public Portfolio Release + Demo Package

- Added local public portfolio asset generation and public-release API endpoints.
- Safety: no GitHub push, publishing, deletion, secret exposure, or approval bypass.

## v4.9 — Quality Gate, Test Runner + Release Verification

- Added verification scripts, release verification core, Quality Gate API endpoints, and reports.
- Safety: verification only; no publishing, pushing, deletion, or approval bypass.

## v4.8 — Frontend Resilience, Error Boundaries + Offline States

- Added panel error boundaries, offline banner, loading skeletons, fallback UI, and backend health checks.
- Backend behavior and approval gates remain unchanged.

## v4.7 — Panel Groups, Layout Presets + Workspace Views

### Added

- Panel groups and dashboard layout presets
- Full Mission Control, Security, Developer, Release, and Minimal views
- Dashboard View Selector panel and active-view persistence
- Workspace view preference foundation

### Safety

- Dashboard views are local UI preferences only
- Backend permissions and approval gates are unchanged

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

## Public demo and responsive showcase hardening

### Added

- Responsive, static-export-compatible `/public-demo` portfolio experience.
- Reusable hero, section, feature, and screenshot presentation components.
- Public landing and UI polish API checks, local report tools, and Aurora panels.
- Atomic, collision-safe readiness report generation.

### Safety

- Public presentation remains local until manually published.
- Readiness checks do not push, publish, expose credentials, or alter tool behavior.

## Production readiness and stable-release hardening

- Added side-effect-free aggregate readiness snapshots and Final Release Candidate v2 artifacts.
- Added a validated, atomic local stable-version marker and gated release packaging.
- Added Production Readiness and Stable Release APIs, agent tools, Aurora panels, and frontend services.
- Kept all GitHub publishing and generated release artifacts manual and local-only.

## Maintenance and patch workflow hardening

- Added bounded local issue triage, deterministic classification, and atomic known-issue storage.
- Added maintenance status/report APIs and Aurora issue-triage controls.
- Validated `v6.2.N` patch versions and patch types, made state reads side-effect free, and gated completion and packaging on an active workflow.
- Added atomic, collision-safe patch artifacts and local-only safety declarations.

## Roadmap and safety governance

- Added bounded, atomic future-feature planning with deterministic safety and release-bucket classification.
- Added a local Safety Review Board with risk scoring, review history, required controls, and explicit development eligibility.
- Prevented critical-risk features from being approved before design changes and a new review.
- Added roadmap/safety APIs, agent tools, Aurora panels, and local-only report packages.
