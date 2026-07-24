# O.R.I.O.N. v4.4 — Frontend Service Layer + State Management Cleanup

## Overview

v4.4 moves Aurora OS backend communication out of dashboard orchestration and into a frontend API service layer.

## API Service Files

```text
src/lib/api/client.ts
src/lib/api/status.ts
src/lib/api/dashboard.ts
src/lib/api/plugins.ts
src/lib/api/tools.ts
src/lib/api/security.ts
src/lib/api/release.ts
src/lib/api/stabilization.ts
src/lib/api/frontend-refactor.ts
src/lib/api/desktop.ts
src/lib/api/sidecar.ts
src/lib/api/notifications.ts
src/lib/api/settings.ts
src/lib/api/workspaces.ts
```

## Goal

The dashboard workspace focuses on state orchestration and visual composition rather than raw fetch logic.

## Safety

This phase does not change backend behavior. It only centralizes frontend API calls.
