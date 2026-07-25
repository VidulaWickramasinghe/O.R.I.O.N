# O.R.I.O.N. v6.2 — Patch Release Manager + Hotfix Workflow

## Overview

v6.2 provides a local-only patch release workflow that turns known post-release
issues into a reviewed patch candidate. It can create patch notes, a hotfix
checklist, a report, and a local package summary.

## Local artifacts

All generated state and artifacts remain under `backend/data/patch_release/`:

- `patch_release_state.json`
- patch-release reports
- patch notes
- hotfix checklists
- package summaries

## Safety

The Patch Release Manager never pushes patches, publishes a release, modifies
GitHub issues, deletes files, exposes secrets, or bypasses approval gates.
Publishing remains a manual, separately reviewed operation.
