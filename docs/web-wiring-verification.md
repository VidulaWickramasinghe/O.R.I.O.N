# Web wiring and first-user workflow verification

## Outcome and scope

This 6.7.0 development increment follows the audit-safety changes merged in PR #131. It connects the first-user workspace workflow, makes local web startup and verification authentication-aware, adds regression coverage for frontend/backend route drift, and provides learner/trainer guidance. Authentication, capability policy, explicit source consent and approval gates remain enforced.

It is not a claim that every historical feature is finished, that all response schemas have been generated from OpenAPI, or that a signed desktop release has been certified.

## Findings and changes

| Finding | Change | Evidence |
| --- | --- | --- |
| Existing workspace empty-state link had no registration form. | Add a typed API mutation and accessible registration form with separate, initially unchecked trust and source-consent controls. Changing the path clears consent. | `workspace-registration.test.tsx`; real HTTP registration and browser smoke test. |
| Workspace validation errors could become HTTP 500. | Bound name/path lengths; return 403 for missing consent and 422 for invalid/missing paths; return the persisted canonical path on success. | `test_web_wiring.py` registration tests. |
| Desktop request messages could be cleared by refresh, or imply success before execution. | Preserve request feedback, prevent duplicate clicks while pending, invalidate approvals, link to Approvals, and display backend policy denials. Label dev scripts high risk. | Browser Strict Mode denial; HTTP request/reject workflow. No desktop action executed in the smoke test. |
| Local launch scripts hardcoded ports and used shell-specific child waiting. | A shared Python launcher coordinates API URL, backend port and CORS for combined/separate terminals. Port conflicts fail without terminating unknown processes. Ctrl+C stops owned process groups. | Alternate-port and occupied-port regressions; real macOS start/stop smoke test. |
| The old verification script called protected endpoints without a session. | Negotiate via the owner-only local socket, keep credentials in memory, disable inherited proxies and redirects, and print status/path only. | Ten live HTTP checks; header/redirection/error-output regressions. |
| Frontend endpoint changes could drift from backend route declarations. | Check frontend API method/path templates against backend route templates in the local and CI gates. | 144 frontend call sites matched 161 backend route declarations; zero indirect call sites. |
| A stabilization test left an incomplete fake global scan cache behind, breaking later real API tests. | Restore that cache with a scoped mock. | Full backend suite including real Release Candidate status serialization. |
| Clean-checkout Rust tests failed because Tauri checked for an unbuilt `externalBin`. | Build the real backend sidecar before Cargo tests, in both desktop workflows. No placeholder executable is introduced. | Local sidecar packaging and four Rust supervisor tests pass. |
| No coherent first-user training flow. | Add System → User guide and a full setup/troubleshooting/trainer checklist. | Production `/help` page built and inspected in the browser. |

## Incremental adoption

1. Stop the existing development services in their own terminals; preserve private `.env`, databases and settings.
2. Update the checkout normally. There is no schema migration and no runtime-data cleanup in this increment.
3. Run `./scripts/start_orion.sh` from `~/O.R.I.O.N`, or use the separate backend/frontend scripts from the same checkout. For alternate ports, pass the same pair to both separate commands.
4. Open the frontend, wait for **Backend connected** in the top bar, and run `./scripts/verify_api.sh` from another terminal. An unauthenticated browser request to the API root is still expected to return 401.
5. Train with a disposable sample folder and Strict Mode. Registering a folder does not index documents or execute code. A security-policy denial is not an authentication failure.
6. Use the existing release gates before packaging. The Rust test entry point now prepares its required sidecar first.

## Validation performed

- Backend compilation and 219 backend regression tests passed, with temporary data isolation established before runtime imports.
- All 87 frontend tests passed across the Vitest and Node test suites; lint, typecheck and production build passed. The new workspace suite covers explicit consent, consent reset, mutation payload/cache refresh, canonical success feedback and retained drafts on failure.
- All 144 recognized frontend API call-site method/path templates matched the backend's 161 declared route templates.
- Thirteen main-window HTTP responses were exercised through the real API router and stores, with real serialization rather than mocked endpoint handlers.
- A disposable HTTP workflow registered a workspace, checked repeat registration, indexed/searched a sample document, requested a desktop action and rejected it. It did not open a folder or launch a workspace command.
- A separately running backend returned HTTP 200 for all ten endpoints in `verify_api.sh`, using an in-memory session and no provider key.
- Browser smoke test: startup changed from authenticating to **Online · authenticated**; invalid-path feedback retained the draft; explicit-consent registration persisted and refreshed the workspace list; Strict Mode rejected a desktop request with the backend reason; System → User guide opened the training page.
- Combined launch used non-default ports. Ctrl+C stopped both services; both ports were closed and the session socket was removed afterward.
- The real macOS ARM64 backend executable was prepared, then all four Rust supervisor tests passed.
- Version consistency, tracked-artifact/security scanner and whitespace checks passed. Runtime databases, credentials, sample data, sidecar binaries and build output are not part of the commit.

## Reproduce locally

From `~/O.R.I.O.N` after setup:

```sh
./scripts/test_backend.sh
npm --prefix frontend run test:wiring
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run build
python3 scripts/sync_release_manifest.py --check
python3 scripts/check_tracked_artifacts.py
./scripts/test_tauri.sh
```

For the live web check:

```sh
./scripts/start_orion.sh --backend-port 8001 --frontend-port 3001
```

Open `http://localhost:3001`; run `./scripts/verify_api.sh` in another terminal. Do not start this alongside another backend from the same checkout. For automated tests, the repository test bootstrap provides disposable stores; never point tests at normal user data.

## Boundaries and remaining verification

- The route check validates recognized API call-site method/path **templates**, not request/response field schemas, runtime template values, every direct fetch, or every feature's semantics. Dynamic action values and payloads still need behavioral tests. Indirect calls are reported explicitly.
- API tests use an authenticated, configured policy fixture. They verify enforcement and wiring, not the user's provider credentials, paid model calls or network availability.
- The browser smoke test used a temporary runtime directory and non-sensitive sample data. No real project was trusted, no provider request was made, and no policy was loosened for that test.
- Process lifecycle smoke validation was on macOS. Shell-based web setup is documented for macOS/Linux; this does not certify Windows process-tree cleanup or platform installers.
- Building the sidecar and passing Rust tests does not establish signing, notarization, clean-machine installation, upgrades or the full cross-platform CI result. Check the follow-up PR's exact CI results before treating it as release evidence.
- The development launcher intentionally does not use backend auto-reload. Restart after backend code or `.env` changes. It starts development services, not a production server or desktop installer.

See [First-time user and trainer guide](first-time-user-guide.md) for the user-facing handoff.

## Workspace and operator-guide follow-up — 2026-09-06

This follow-up does not change backend permissions, registered workspaces, schemas or user data. It addresses the misleading expectation that adding a workspace must populate Approvals.

- Registration now explicitly says it creates no approval. Workspace buttons say **Request**, link to the operating guide, and preserve the distinction between an accepted request and a policy denial.
- Approvals explains empty queues, offers manual refresh and recent terminal history, and refreshes mission/run caches after an approve or reject decision. A terminal approval is never presented as a new executable request.
- Mission cycle feedback reports the backend status instead of calling every successful HTTP response a completed cycle.
- System → User guide provides five ordered walkthroughs, every current primary sidebar destination, recovery guidance and a trainer checklist. It documents that the sidebar workspace preference does not bind missions, goal text is not a sandbox, and the environment selector is a label rather than isolation. Balanced and Developer Lab currently enable the same broad plugin set; neither bypasses approvals or certifies production readiness.
- The global Active Work / authentication strip is removed. Analytics alone contains a source-backed Live operations board with shared queries, 30-second refresh, explicit unavailable/stale states and coverage limits: latest 20 missions and up to 100 records per approval state. Ready plans are not reported as active execution. This snapshot is separate from the historical charts and their time-range filter.

Follow-up validation:

- Backend compilation and all **221 backend tests** passed. New assertions cover no approval after registration, no pending row after a policy-denied desktop request, and retained rejected history.
- All **95 frontend tests** passed, including history toggling, approval-driven mission cache refresh, truthful Ready/offline board states and guide coverage of every sidebar route. Lint, typecheck and the production build passed.
- API route-template checks (144 call sites / 161 declarations), version consistency, tracked-artifact/security scanning and whitespace checks passed.
- Browser smoke validation used a disposable runtime with no provider key: authenticated Approvals and history loaded, the guide anchor opened the intended workflow, and the Analytics-only board displayed real empty state and source/freshness information. The global strip was absent. The owned test servers were then stopped; no real workspace action or provider call was executed.
- These checks do not certify live AI task success, full accessibility conformance, signed installers or production deployment. Review the follow-up PR's CI before merging.
