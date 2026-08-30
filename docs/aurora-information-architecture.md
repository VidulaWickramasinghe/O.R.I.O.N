# Aurora OS information architecture

Aurora OS has seven primary destinations:

1. Dashboard
2. Assistant
3. Missions
4. Context
5. Workspaces
6. Governance
7. System

Specialist functions appear as contextual second-level links. For example,
Tools, Plugins, and Security live under Governance; Analytics, Settings, and
the read-only Console live under System; Workflows and Agent Readiness live
under Missions. This keeps every core task within two navigation decisions.

Historical demo, launch, patch, roadmap, and portfolio utilities are not
primary navigation. Their routes remain available for explicit advanced or
historical workflows, but Aurora does not present them as peer product areas.

The authoritative mapping is `frontend/src/lib/aurora-data.ts`. Both the
sidebar and the contextual task navigation consume that mapping so route
ownership cannot drift between two independent menus.
