# O.R.I.O.N. Safety Model

O.R.I.O.N. is designed as a controlled AI desktop assistant.

## Current Safety Rules

- No unrestricted shell command execution
- No destructive file deletion tools
- No access outside the project root for safe file tools
- No automatic credential exposure
- No `.env` file committed to GitHub
- Activity logs track user requests and agent execution
- Tool logs track tool start, completion, and errors

## Command Permissions

Safe commands are allowlisted in:

```text
backend/tools/dev_tools.py
