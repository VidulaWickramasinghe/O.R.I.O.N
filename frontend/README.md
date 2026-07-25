# O.R.I.O.N. Mission Control Frontend

Advanced Next.js and Tauri interface for the **Operational Response and Intelligent Orchestration Network**.

## Dashboard rebuild — v6.7

The main dashboard and application shell have been redesigned as a responsive, customisable command centre while preserving the existing API integrations, Zustand stores, specialist modules, routes and desktop configuration.

### New interface capabilities

- Three-state desktop navigation: expanded, compact icon rail and fully hidden
- Persistent sidebar and foldable navigation-group preferences
- Ctrl/Cmd+B navigation shortcut and top-bar restore control
- Responsive mobile navigation drawer independent of desktop state
- Search-first command bar with live system, safety and notification controls
- Mission-awareness context rail with Context and Activity views
- Dashboard presets: **Overview**, **Operations** and **Developer**
- Slide-out widget customiser with panel visibility controls
- Compact and expanded metric layouts
- Animated neural-core command visual and live mission event controls
- System health, operational queue, model mesh and lifecycle telemetry
- Interactive 24-hour, 7-day and 30-day performance analytics
- Execution/latency trend visualisation, mission-outcome distribution and agent utilisation
- Activity-density heatmap, reliability statistics, forecasting and anomaly insights
- Reorganised advanced workspace for existing API-backed modules
- Improved visual hierarchy, accessibility, focus states and reduced-motion support

## Requirements

- Node.js 20 or newer
- npm
- The O.R.I.O.N. backend for live API data; the interface continues to render in offline/demo mode when the backend is unavailable

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production validation

```bash
npm run lint
npm run build
npm run start
```

## Desktop mode

```bash
npm run desktop:dev
```

Build the desktop package with:

```bash
npm run desktop:build
```

## Main rebuilt files

- `src/components/aurora/dashboard-workspace.tsx`
- `src/components/aurora/analytics-overview.tsx`
- `src/components/aurora/app-shell.tsx`
- `src/components/aurora/sidebar.tsx`
- `src/components/aurora/topbar.tsx`
- `src/components/aurora/context-panel.tsx`
- `src/store/ui-store.ts`
- `src/app/globals.css`
