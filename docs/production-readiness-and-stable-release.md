# Production Readiness and Stable Release

O.R.I.O.N. aggregates its release, presentation, safety, and static-site checks
through read-only production snapshots. The snapshot does not generate a public
release as a side effect.

The Stable Release workflow adds a **local marker** and prepares reviewable
artifacts. It does not make Git immutable, push commits, or publish a release.

## API

- `GET /api/production-readiness/status`
- `POST /api/production-readiness/report/save`
- `POST /api/production-readiness/release-candidate-v2`
- `GET /api/stable-release/status`
- `POST /api/stable-release/lock`
- `POST /api/stable-release/unlock`
- `POST /api/stable-release/report/save`
- `POST /api/stable-release/package`

Generated artifacts remain under ignored `backend/data/` directories. Run local
checks from `~/O.R.I.O.N/` and manually review all files before any GitHub action.
