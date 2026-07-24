# O.R.I.O.N. v4.0 — Autonomous Release Candidate + System Freeze

## Overview

v4.0 introduces the local Release Candidate Manager for portfolio and demo
readiness. It provides a system-freeze state, a release checklist, a final
diagnostics package, and generated report artifacts.

## System Freeze

System Freeze marks O.R.I.O.N. as being in release-candidate mode. It does
not push to GitHub, delete files, publish releases, disable approval gates, or
execute uncontrolled commands.

## Release Package Contents

Packages are written locally to `backend/data/release_candidates/` and include:

- Dashboard Intelligence snapshot
- Plugin Registry, Tool Permission, Tool Audit, and Security Policy reports
- System Doctor report and startup briefing
- Release checklist and package summary
- The existing local demo release pack, when available

## API

```text
GET  /api/release-candidate/status
POST /api/release-candidate/freeze
POST /api/release-candidate/unfreeze
POST /api/release-candidate/package
```
