# Public Demo Website and Responsive UI Checks

O.R.I.O.N. includes a static-export-compatible portfolio route at `/public-demo`.
The page presents the product architecture, safety model, feature set, screenshot
registry, and guided demo flow without connecting to private data.

## Local preview

```bash
cd ~/O.R.I.O.N/frontend
npm run dev
```

Open `http://localhost:3000/public-demo`.

## Verification API

- `GET /api/public-landing/status`
- `POST /api/public-landing/report/save`
- `GET /api/ui-polish/status`
- `POST /api/ui-polish/report/save`

Generated reports stay under ignored `backend/data/` directories. The scanners
only inspect repository-owned frontend source and static assets; they do not
publish, push, record the screen, expose credentials, or bypass approvals.
