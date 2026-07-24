# O.R.I.O.N. v4.1 — Stabilization, Bug Fixing + Codebase Cleanup

## Overview

v4.1 adds a read-only Stabilization Manager for release hardening. It checks
required backend and frontend files, import and path risks, exact duplicate
source zones, code risk patterns, backend compile health, and optional frontend
build health.

## Safety

The Stabilization Manager only scans and reports. It never deletes or rewrites
files; any cleanup edit remains subject to O.R.I.O.N.'s existing approval flow.

## API

```text
POST /api/stabilization/scan
POST /api/stabilization/report/save
```

## Report Location

```text
backend/data/stabilization_reports/
```
