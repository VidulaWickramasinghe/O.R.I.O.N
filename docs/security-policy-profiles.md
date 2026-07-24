# O.R.I.O.N. v3.9 — Security Policy Profiles + Risk Modes

## Overview

v3.9 adds security profiles that control plugin states according to risk mode.

## Profiles

### Strict Mode

Maximum safety. Disables high-risk operational plugins such as desktop control, developer agent, browser research, vector memory, and backend sidecar.

### Balanced Mode

General productive mode. Enables most plugins while preserving approval gates.

### Developer Lab Mode

Development-focused mode. Enables advanced developer modules while preserving approval gates and audit logging.

## Safety

- Approval gates remain active.
- Protected plugins cannot be disabled by policy profiles.
- Security Policy changes are logged in policy events.
- Security Policy changes also create audit events.
- v3.9 does not execute third-party plugin code.
