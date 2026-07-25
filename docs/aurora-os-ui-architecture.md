# Aurora OS 6.5 UI architecture

Aurora OS uses one responsive `AppShell` for every operational route. It owns the grouped sidebar, compact command header, single scrolling workspace, optional context rail, assistant dock, mobile navigation, command palette, notifications, and connection feedback.

## Navigation and routes

Navigation is grouped into Core, Intelligence, Tools, and Administration. The default dashboard is mission-first. Specialist release, maintenance, demo, roadmap, and safety modules live in `/governance` rather than crowding the dashboard. Existing Assistant, Missions, Projects, Workspaces, Memory, Agents, Tools, Browser, Voice, and Demo integrations remain routed through their established workspaces.

## Responsive model

Desktop uses a collapsible 256/80px sidebar and optional 340px context rail. Tablet uses compact navigation and a context slide-over. Mobile uses a drawer, bottom navigation, single-column content, safe-area-aware assistant dock, and 42px minimum controls. The shell owns horizontal clipping and one primary vertical scrollbar; bounded feeds may scroll internally.

## Components and tokens

Shared primitives live below `components/aurora/data-display`, `feedback`, `navigation`, and `dashboard`. CSS variables in `globals.css` define surfaces, borders, accents, semantic colours, radius, shadow, motion, and focus treatment. `status-semantics.ts` is the canonical status-to-tone mapping.

## State and data

Zustand stores operational preferences; only sidebar and context-rail preferences persist. API access remains centralised in `lib/api/client.ts`, now with JSON headers, timeouts, useful errors, and safe fallbacks. Missing endpoints render `Unavailable` instead of invented live telemetry.

## Desktop and migration

Static export remains enabled and Tauri continues to load `../out`. Desktop metadata uses version 6.5.0 and supports a 900×640 minimum window. Legacy release panels remain available in the Governance Centre while the primary dashboard uses the new mission-first hierarchy.

## Validation

Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `./scripts/test_frontend.sh`, and `./scripts/quality_gate.sh`. Check 375, 430, 768, 1024, 1280, 1440, and 1920px viewports.
