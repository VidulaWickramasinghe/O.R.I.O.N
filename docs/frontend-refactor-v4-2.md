# O.R.I.O.N. v4.2 — Frontend Refactor + Component Architecture Cleanup

## Overview

v4.2 begins the Aurora OS frontend refactor by moving shared types, API helpers,
and selected dashboard panels into dedicated modules.

## Structure

```text
frontend/src/components/aurora/panels
frontend/src/components/aurora/ui
frontend/src/components/aurora/layout
frontend/src/lib/api
frontend/src/types
```

## First Extracted Components

- DashboardIntelligencePanel
- ReleaseCandidatePanel
- StabilizationPanel
- FrontendRefactorPanel

## Safety

The refactor is structural and preserves Aurora OS styling. It does not redesign
the interface or perform destructive cleanup.
