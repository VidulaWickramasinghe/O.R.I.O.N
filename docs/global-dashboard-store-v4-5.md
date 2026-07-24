# O.R.I.O.N. v4.5 — Global Dashboard Store

## Overview

v4.5 introduces a global Aurora OS dashboard store using Zustand. The store centralizes dashboard state, loading flags, refresh actions, and store-backed mutations without changing backend behavior.

## Store File

```text
frontend/src/store/auroraStore.ts
```

## Responsibilities

- Dashboard intelligence, plugins, permissions, audit events, and security policy
- Release candidate, stabilization, frontend refactor, desktop shell, and sidecar state
- Notifications, reminders, and user settings
- Global refresh actions for dashboard state

## Safety

This phase centralizes frontend state management only. It preserves the existing Aurora OS appearance and backend behavior.
