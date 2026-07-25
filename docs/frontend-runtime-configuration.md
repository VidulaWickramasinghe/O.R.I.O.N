# Aurora OS runtime configuration

Aurora OS uses one browser-safe runtime configuration in
`frontend/src/lib/config/runtime.ts`. Copy the example before starting locally:

```bash
cd ~/O.R.I.O.N/
cp frontend/.env.example frontend/.env.local
```

| Variable | Visibility | Purpose | Default |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_ORION_API_URL` | Browser | Public O.R.I.O.N. API origin | `http://127.0.0.1:8000` |
| `ORION_INTERNAL_API_URL` | Server only | Server-side and contract-tooling origin | Public URL |
| `NEXT_PUBLIC_ORION_API_BASE` | Browser | Deprecated compatibility alias | None |

Trailing slashes are removed centrally. Browser variables must never contain
credentials. The API client applies a 20-second timeout, accepts caller-owned
abort signals, and distinguishes cancellation, offline failures, validation
errors, permission failures, conflicts, and retryable server failures.

Start the services from the canonical checkout:

```bash
cd ~/O.R.I.O.N/
./scripts/run_backend.sh
./scripts/run_frontend.sh
```

The backend currently configures CORS in `backend/api_main.py`; production and
desktop origins must remain explicit rather than using credentialed wildcard
CORS. Tauri should use the same configured API origin and tolerate the sidecar
startup window through the existing sidecar status workflow.
