# O.R.I.O.N. v3.7 — Tool Permission Enforcement Layer

## Overview

v3.7 connects the Plugin Registry to selected tools through a permission enforcement decorator. When a protected tool runs, O.R.I.O.N. checks:

1. Which plugin owns the tool.
2. Whether that plugin is enabled.
3. Whether the plugin is protected.
4. Whether the tool should continue or return a blocked response.

## Enforcement Strategy

v3.7 uses function-level enforcement:

```python
@function_tool
@instrument_tool("tool_name")
@enforce_tool_permission("tool_name")
def tool_name(...):
    ...
```

The agent tool list remains stable in this release; protected tools decide at execution time whether to continue.

## Protected Modules in v3.7

- Developer tools
- Desktop tools
- Agentic Developer Mode tools
- Browser research tools
- Knowledge tools
- Vector memory tools
- Backend sidecar tools

## API Endpoints

```text
GET /api/tools/permissions
GET /api/tools/permissions/{tool_name}
```

## Safety

- Disabled plugins block mapped tools.
- Blocked tool attempts are logged to the activity stream.
- Plugin Registry, User Settings, Approval System, and Dashboard Intelligence remain protected.
- v3.7 does not dynamically execute third-party plugin code.
- Approval gates remain active.
