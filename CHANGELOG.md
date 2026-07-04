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
