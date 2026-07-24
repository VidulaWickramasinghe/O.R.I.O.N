# O.R.I.O.N. v3.8 — Tool Permission Enforcement Expansion + Audit Center

## Overview

v3.8 expands v3.7 permission enforcement and adds a local Tool Audit Center. The audit center records:

- Tool name
- Plugin key
- Decision: allowed or blocked
- Reason
- Risk level
- Category
- Timestamp

## New API

```text
GET /api/tools/audit
```

## Security Purpose

The Tool Audit Center makes O.R.I.O.N. more transparent by showing which protected tools were allowed or blocked and why.

## Safety

- Audit data is local.
- Disabled plugins block mapped tools.
- Blocked attempts are logged.
- Approval gates remain active.
- v3.8 does not dynamically execute third-party plugin code.
