# O.R.I.O.N. v6.2 Production Hardening Checklist

O.R.I.O.N. retains the v6.2 Patch Release Manager version line while completing
the installer, System Doctor, and Local Knowledge Base milestones introduced in
earlier releases.

## Installation and environment

- [ ] Run `./scripts/setup_orion.sh` from the repository root.
- [ ] Store `OPENAI_API_KEY` only in `backend/.env`.
- [ ] Confirm `.env`, local databases, dependency folders, and build output are ignored.
- [ ] Run `./scripts/doctor.sh` and review every item marked `CHECK`.

## Backend and API

- [ ] Run `./scripts/test_backend.sh`.
- [ ] Confirm `/api/health`, `/api/system/doctor`, and `/api/patch-release/status` return HTTP 200.
- [ ] Confirm the System Doctor response does not contain secret values.
- [ ] Exercise Knowledge Base indexing with a disposable document and remove generated state afterward.

## Frontend and desktop

- [ ] Run `npm ci --prefix frontend`.
- [ ] Run `npm --prefix frontend run lint`.
- [ ] Run `npm --prefix frontend run build`.
- [ ] Open Aurora OS and run **Production Health → Run System Doctor**.
- [ ] For desktop packages, install the platform libraries listed in `docs/installation.md` before running the Tauri build.

## Release safety

- [ ] Review `git status --short` and stage only intended source and documentation changes.
- [ ] Never stage `backend/.env`, local SQLite databases, logs, audio, generated reports, or build output.
- [ ] Keep patch packaging local; publishing and pushing remain explicit manual actions.
