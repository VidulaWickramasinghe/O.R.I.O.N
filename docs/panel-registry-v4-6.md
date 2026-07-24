# O.R.I.O.N. v4.6 — Panel Registry + Customizable Dashboard Layout

## Overview

v4.6 introduces the Aurora OS Panel Registry. Registered panels carry IDs, categories, default visibility, pinning, display order, and version metadata.

## New Files

```text
frontend/src/types/panels.ts
frontend/src/lib/panelRegistry.ts
frontend/src/lib/panelLayoutStorage.ts
frontend/src/components/aurora/panels/DashboardLayoutPanel.tsx
```

## Layout Persistence

Dashboard layout preferences are stored in browser localStorage. Users can hide, show, pin, and reorder panels locally.

## Safety

Panel visibility does not enable or disable backend tools. Plugin permissions and approval gates remain unchanged.
