# Aurora OS frontend/backend integration

## Architecture discovered

The backend is a single FastAPI application in `backend/api_main.py`. Its route
handlers delegate domain work to modules under `backend/tools/`, use Pydantic
request/response models, and persist selected local state under `backend/data/`.
Approval, plugin, tool-permission, security-policy, release-lock, and governance
checks remain backend responsibilities. There are no declared streaming or
WebSocket endpoints.

The frontend is a Next.js 16 application with route-specific workspaces, feature
API modules under `frontend/src/lib/api/`, TanStack Query, and an Aurora shell.
All feature modules share the typed transport in `frontend/src/lib/api/client.ts`
and runtime origin in `frontend/src/lib/config/runtime.ts`.

## Capability and route policy

| Frontend route | Backend source | Availability policy |
| --- | --- | --- |
| `/` | Status, mission, activity, dashboard intelligence | Independent panels fail without fabricating telemetry. |
| `/assistant` | `POST /api/chat`, context preview | Normal response only; streaming and attachments remain unavailable. |
| `/missions` | Mission, run, report, approvals | Expose only run-next/run-batch/report operations. |
| `/projects`, `/memory` | Project/memory/context/vector routes | Project/memory records are read-only; vector rebuild is separately permissioned. |
| `/workspaces` | Workspace list/register/detail | Client layout storage is explicitly frontend-only. |
| `/tools`, `/security` | Tool audit/permission, plugins, approvals, security policy | Backend decisions always win. |
| `/browser`, `/voice` | Controlled browser research; voice status/reset | Do not expose unrestricted navigation, recording, or device controls. |
| `/workflows` | Blueprint list/detail/create-mission | Progress is represented by the created mission. |
| `/system`, `/settings` | Status/doctor/sidecar/plugins/profile | Offline and partial failures remain panel-local. |
| `/demo`, `/portfolio`, `/public-demo` | Demo and release presentation routes | Demo/static/live sources must be visibly distinguished. |
| `/governance` | Maintenance, patch, roadmap, safety review | Preserve eligibility, review, freeze, and package constraints. |
| `/agents`, `/analytics`, `/console` | No dedicated API | Capability-unavailable views only; no fake controls or live values. |

## Request lifecycle

The client supports JSON and non-JSON responses, multipart bodies, query
parameters, all standard HTTP methods, cancellation, bounded timeouts, and typed
errors. FastAPI `422` issue locations can be mapped to fields with
`getValidationFieldErrors`. Status `403` remains an approval/permission outcome;
it is never retried as if it were an outage. Only timeouts, rate limits, and
server/dependency failures are marked retryable.

Pages must show shaped loading content, an explanatory empty state, a safe error
message, and a retry action. Active mutations must be disabled to prevent double
submission. Search callers should debounce and cancel stale requests. There is no
real-time backend transport, so refresh is manual or bounded to active operations.

## Connection and capability states

`GET /api/status` is the health source. UI states are `connecting`, `connected`,
`degraded`, `offline`, `unauthorised`, and `incompatible version`. A module error
must not blank the whole dashboard. Plugin and permission routes determine
whether related actions are enabled; capabilities are never all assumed true.

## Security and data handling

- Do not store credentials, memory content, internal paths, or tokens in browser
  storage, URLs, logs, or public environment variables.
- Approval decisions use the verified approval routes and refresh the related
  mission/tool state.
- Generated reports and databases remain ignored; paths returned by backend
  operations are displayed as metadata, not opened automatically.
- Console pages never become an unrestricted terminal.
- File upload controls stay unavailable because no multipart upload route exists.

## Validation checklist

```bash
cd ~/O.R.I.O.N/
python -m py_compile backend/api_main.py
./scripts/test_backend.sh
./scripts/test_frontend.sh
./scripts/quality_gate.sh
cd frontend && npm run lint && npm run typecheck && npm run build
```

Known limitation: several backend handlers synchronously generate reports or
packages and provide neither task IDs nor progress events. Aurora OS can show a
bounded mutation state and final response, but cannot provide truthful incremental
progress or cancellation until the backend contract supports it.
