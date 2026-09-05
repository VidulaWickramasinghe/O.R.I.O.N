# September audit follow-up

This increment addresses the ten urgent findings supplied with the development audit. It does not claim to complete the separate 31-task backlog or certify a production release. The release manifest remains **6.7.0 development**.

## Implementation and migration sequence

1. Isolate test persistence before importing application modules; move remaining exercised runtime writers behind `runtime_data_dir()`.
2. Make Release Candidate status and its dashboard-intelligence dependency read-only.
3. Strengthen existing approval evidence and workspace validation without adding an alternate execution path.
4. Complete bounded authenticated startup and correct operational metric grain.
5. Add per-conversation context controls and free-form mission authoring using the existing gateway and mission store.
6. Align active identity claims, run regressions, and review the browser flows before publishing.

No database schema migration is required. Existing missions and historical reports are preserved. Old package-script approvals without reviewable command evidence must be requested again. Existing conversations without a matching context-policy fingerprint require a new conversation; their persisted history is not deleted. Runtime files previously written directly under `backend/data` are not automatically moved into a custom `ORION_DATA_DIR`; users should back up and explicitly migrate any retained data.

## Finding-to-change map

| Finding | Implemented change | Primary regression evidence |
| --- | --- | --- |
| Tests pollute runtime stores | `backend.tests` establishes disposable data and broker paths before runtime imports, overriding exported user paths. Provider credentials are disabled in tests. Legacy exercised writers now honor the runtime directory. | Child-process sentinel test; before/after SHA-256 comparison of all 24 existing worktree data/log files. |
| Backend gate failures | Full compile and discovery gate runs against isolated fixtures; outdated placeholder assertions track the new truthful UI contract. | 210 backend tests pass. |
| RC status HTTP 500 | Removed reminder refresh from dashboard-intelligence reads and removed the RC GET activity write. | Real authenticated RC GET serializes an empty-runtime snapshot without an activity write. Missing release checks remain failed. |
| Package scripts understated | Build/dev requests show high risk, pre/main/post script contents, canonical workspace path and manifest hash. Execution revalidates that evidence. Command allowlist matching is exact; nonzero process exits fail. | Lifecycle evidence, changed manifest, missing evidence and command-prefix regressions. |
| Desktop portability and trust | Native macOS/Linux/Windows opener selection; execution rechecks workspace trust and approved canonical path. Missing launchers and revoked trust produce failures, not success-like text. | Mocked platform opener tests, revoked-trust API/executor tests, replaced-root symlink test. |
| Cold startup false failures | Broker starts after backend initialization; concurrent frontend requests share bounded session negotiation and do not issue credentialless protected calls while starting. Failed desktop negotiation can retry. | Cold bootstrap, unavailable bootstrap, token refresh and credential-free health tests. |
| Invalid success denominator | Metrics count only terminal `capability.execution` records by completion time. Decisions, internal primitives and running work do not enter the denominator. Agent-run outcomes and usage are separate. | Mixed-grain fixture yields exactly two finished calls and 50% success; empty telemetry stays empty. |
| Opaque outbound context | Assistant workspace/source controls, explicit embedding opt-in, this-turn preview plus system instructions, optional preview hash guard, new conversation when context choices change. Memory/knowledge/vector tools honor the same per-run exclusions. | Exclusion tests, stale-preview rejection before provider call, conversation-policy mismatch tests and frontend handoff regression. |
| Blueprint-first mission creation | Goal/title/ordered-step form with add/remove/reorder and priority. Gateway-protected POST creates a durable planned mission without running it. | Authenticated create/read regression, disabled-capability rejection, blank-step validation, component test and isolated browser save. |
| Inconsistent active claims | Active RC/demo/prompt/UI identity uses generated release metadata. Removed unsupported configured-model inventory. Reference graph nodes no longer claim a report is complete. | Manifest consistency, historical-demo preservation and UI source-contract tests. |

## Verification

Run from the canonical checkout:

```sh
cd ~/O.R.I.O.N
./scripts/test_backend.sh
python3 scripts/sync_release_manifest.py --check
python3 scripts/check_tracked_artifacts.py
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run build
npm --prefix frontend run test:server-state
npm --prefix frontend run test:ux
npm --prefix frontend run test:command-palette
npm --prefix frontend run test:recovery
npm --prefix frontend run test:pet
npm --prefix frontend run test:settings
npm --prefix frontend run test:api-auth
```

The backend runner also accepts `ORION_PYTHON_BIN` for an existing Python environment. Unit-test isolation applies to both discovery and individual test-module imports. Do not import runtime modules before the test bootstrap in new tests.

Local validation: backend compilation and 210 tests, 84 frontend tests, lint, TypeScript, optimized web build, version consistency, tracked-artifact scan and whitespace checks. A real browser connected to a temporary, provider-disabled backend verified authenticated startup, free-form mission persistence without execution, and context preview with sources excluded. Temporary test records are not product data or release evidence.

## Boundaries and remaining work

- Package scripts remain arbitrary workspace code executed with the user's OS permissions, not an OS sandbox. The manifest hash detects changed script declarations, not every dependency or source-file change. Approval does not promise a harmless build.
- Context preview covers this turn's prepared input and system instructions, not the entire provider wire request or future tool results. Existing conversation history remains in that conversation. These controls constrain automatic retrieval and the memory/knowledge/vector plugins; they are not a universal information-flow sandbox for all tools.
- Mission authoring saves reviewed ordered steps. Dependency editing, full graph authoring and a redesigned three-pane mission inspector remain separate work.
- Historical release tools and generated reports retain their historical identity. Active metadata does not prove release readiness.
- Existing polluted runtime records were not deleted or rewritten. No automated classification of user records as test data was attempted.
- Native opener dispatch is regression-tested with mocks. Signed installers, clean-machine tests, live provider calls and the complete cross-platform release gate were not run for this increment. This is not RC or production certification.
- Telemetry remains limited by recorded events. Legacy records without terminal capability evidence are intentionally excluded rather than converted into invented executions.
