# O.R.I.O.N. Mission Control Frontend

Advanced Next.js and Tauri interface for the **Operational Response and Intelligent Orchestration Network**.

## Dashboard rebuild — v6.7

The main dashboard and application shell have been redesigned as a responsive, customisable command centre while preserving the existing API integrations, Zustand stores, specialist modules, routes and desktop configuration.

### New interface capabilities

- Complete product navigation in one foldable left sidebar
- One-at-a-time hide and restore controls with a persistent Ctrl/Cmd+B shortcut
- Production O.R.I.O.N. app icon branding without a redundant sidebar tagline
- Persistent sidebar and foldable navigation-group preferences
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
- Grouped backend profile settings and immediate device-only interface preferences

## Requirements

- Node.js 20 or newer
- npm
- The O.R.I.O.N. backend for live API data; the interface continues to render in offline/demo mode when the backend is unavailable

## Run locally

Start the services in two terminals from the repository root:

```bash
# Terminal 1
cd ~/O.R.I.O.N/
./scripts/run_backend.sh

# Terminal 2
cd ~/O.R.I.O.N/
./scripts/run_frontend.sh
```

Open `http://localhost:3000`.

The development backend creates an ephemeral API credential and exposes it only
through an owner-only local socket. The custom Next.js development server
negotiates that credential in memory for the browser; it is not printed, placed
in a `.env` file, or written into the frontend bundle. Tauri development uses
the Rust supervisor handshake instead.

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

## Development cache recovery

The default development command uses the webpack development server because it
is more reliable when `~/O.R.I.O.N/` is hosted on a bind-mounted or network-backed
workspace. Before startup, it detects an empty Next.js manifest and removes the
corrupted `.next` cache automatically. It also clears `.next/dev` on every
startup so interrupted route compilation cannot retain stale module handlers:

```bash
cd ~/O.R.I.O.N/frontend/
npm run dev
```

`npm run dev` may be started before or after the backend. Until the backend is
available, Aurora renders its explicit offline state; retrying the connection
after backend startup establishes the authenticated session automatically.

On a fast local filesystem, Turbopack remains available explicitly with
`npm run dev:turbo`. If a development server was interrupted while writing its
cache, stop every running Next.js process before restarting it.
