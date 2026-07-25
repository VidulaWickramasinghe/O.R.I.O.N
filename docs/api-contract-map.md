# O.R.I.O.N. API contract map

This inventory was verified against the FastAPI decorators and Pydantic response
models in `backend/api_main.py`. The running OpenAPI document remains the
authoritative machine-readable contract.

| Capability | Methods and verified route families | Contract / execution notes |
| --- | --- | --- |
| Platform | `GET /`, `GET /api/status`, `GET /api/health` | Immediate status; no authentication decorator is present. |
| Dashboard | `GET /api/mission`, `GET /api/activity`, `POST /api/activity/clear`, `GET /api/dashboard/intelligence` | Activity clear mutates local history. |
| Projects and memory | `GET /api/projects[/{project_key}]`, `GET /api/memory`, `GET /api/memory/search`, `POST /api/context/preview` | Read-only project/memory resources in this API. Search uses query parameters. |
| Missions | `GET /api/missions[/{mission_id}]`, `GET /api/mission-runs`, `GET /api/missions/{id}/runs`, `POST /api/missions/{id}/run-next`, `POST /api/missions/{id}/run-batch`, `POST /api/missions/{id}/report` | Run endpoints are the supported execution controls; generic create/pause/resume/cancel routes do not exist. |
| Approvals | `GET /api/approvals`, `POST /api/approvals/{id}/approve`, `POST /api/approvals/{id}/reject` | Decisions are server-side and update mission/tool state; never simulate locally. |
| Workspaces | `GET /api/workspaces`, `POST /api/workspaces/register`, `GET /api/workspaces/{id}/{summary,stack,tree}` | Register is the only resource mutation. Layout preferences remain frontend-only. |
| Assistant | `POST /api/chat` | Non-streaming response; no SSE or WebSocket chat route is declared. |
| Browser and voice | `POST /api/browser/{compare,save,research}`, `POST /api/browser-research`, `GET /api/voice/status`, `POST /api/voice/reset` | Controlled research only; no unrestricted browser session/navigation API. Voice exposes status/reset, not recording controls. |
| Knowledge and vectors | `GET /api/knowledge/documents`, `POST /api/knowledge/{index,index-folder,search}`, `GET /api/vector/items`, `POST /api/vector/{rebuild,search}` | Indexing and rebuild can be longer-running but return synchronously; no task stream is declared. |
| Workflows and developer | `GET /api/workflows/blueprints[/{key}]`, `POST /api/workflows/blueprints/{key}/create-mission`, `/api/developer/*` | Workflow execution is mission creation, not a simulated client run. |
| Notifications/settings | `/api/notifications/*`, `GET /api/settings/profile`, `POST /api/settings/profile/reset`, `POST /api/settings/profile/{key}` | Reminder and profile mutations persist through backend tools. |
| Plugins/tools/security | `GET /api/plugins[/{key}]`, `POST /api/plugins/{key}/status`, `GET /api/tools/permissions[/{tool}]`, `GET /api/tools/audit`, `GET /api/security/policy`, `GET /api/security/policy/profiles/{key}`, `POST /api/security/policy/apply` | Backend plugin, permission, approval, and policy results are authoritative. |
| Desktop | `POST /api/desktop/workspaces/{id}/{open-vscode,open-folder,start-dev}`, `POST /api/desktop/open-url`, `GET /api/sidecar/status`, `POST /api/sidecar/{start,stop,restart}`, `GET /api/desktop-shell/status` | Local-only safety checks remain enforced by backend tools. |
| Demo | `GET /api/demo/status`, `POST /api/demo/mode`, `POST /api/demo/release-pack` | Demo state must remain visibly labelled. |
| Release | `/api/release-candidate/*`, `/api/stabilization/*`, `/api/quality-gate/*`, `/api/public-release/*`, `/api/github-polish/*`, `/api/portfolio-showcase/*`, `/api/demo-walkthrough/*`, `/api/demo-recording/*`, `/api/final-launch/*`, `/api/github-launch/*`, `/api/public-landing/*`, `/api/ui-polish/*`, `/api/production-readiness/*`, `/api/stable-release/*` | Check/status, report, lock/freeze, and package actions are synchronous backend operations and may write ignored reports. |
| Governance | `/api/post-release-maintenance/*`, `/api/patch-release/*`, `/api/roadmap-planner/*`, `/api/safety-review-board/*` | Review, maintenance, release-lock, and package rules are backend-owned. |

## Unsupported contract assumptions

The API declares no authentication router, agent-control API, analytics API,
console execution API, unrestricted terminal, file-upload handler, SSE endpoint,
or WebSocket endpoint. Corresponding Aurora OS views must therefore show a clear
capability-unavailable state or safe navigation rather than active fake controls.

## Verification

With the backend running, verify the deployed contract rather than guessing:

```bash
cd ~/O.R.I.O.N/
curl --fail http://127.0.0.1:8000/openapi.json > /tmp/orion-openapi.json
curl --fail http://127.0.0.1:8000/api/status
./scripts/verify_api.sh
```

Generated schemas, reports, databases, and `/tmp/orion-openapi.json` are not
committed.
