from agents import function_tool

from core.release_candidate import (
    freeze_system,
    generate_release_candidate_package,
    get_freeze_state,
    render_release_candidate_report,
    unfreeze_system,
)
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission


@function_tool
@instrument_tool("get_release_candidate_status")
@enforce_tool_permission("get_release_candidate_status")
def get_release_candidate_status() -> str:
    """Get O.R.I.O.N. v4.0 release-candidate freeze status."""
    state = get_freeze_state()
    return f"""Release Candidate Status

Frozen: {state['frozen']}
Version: {state['release_version']}
Name: {state['release_name']}
Reason: {state['freeze_reason']}
Frozen At: {state['frozen_at']}
Updated At: {state['updated_at']}"""


@function_tool
@instrument_tool("freeze_release_candidate")
@enforce_tool_permission("freeze_release_candidate")
def freeze_release_candidate(reason: str = "Preparing v4.0 release candidate.") -> str:
    """Enable local O.R.I.O.N. release-candidate freeze mode."""
    state = freeze_system(reason=reason, release_version="v4.0")
    return f"""System Freeze enabled.

Frozen: {state['frozen']}
Version: {state['release_version']}
Reason: {state['freeze_reason']}
Frozen At: {state['frozen_at']}"""


@function_tool
@instrument_tool("unfreeze_release_candidate")
@enforce_tool_permission("unfreeze_release_candidate")
def unfreeze_release_candidate(reason: str = "Release candidate freeze lifted.") -> str:
    """Disable local O.R.I.O.N. release-candidate freeze mode."""
    state = unfreeze_system(reason=reason)
    return f"""System Freeze disabled.

Frozen: {state['frozen']}
Reason: {state['freeze_reason']}
Unfrozen At: {state['unfrozen_at']}"""


@function_tool
@instrument_tool("generate_release_candidate_package")
@enforce_tool_permission("generate_release_candidate_package")
def generate_release_candidate_package_tool() -> str:
    """Generate a local O.R.I.O.N. v4.0 release-candidate package."""
    result = generate_release_candidate_package()
    artifacts = "\n".join(f"- {key}: {value}" for key, value in result["artifacts"].items())
    return f"""Release Candidate Package generated.

Status: {result['status']}
Generated At: {result['generated_at']}
Summary: {result['summary_path']}

Artifacts:
{artifacts}"""


@function_tool
@instrument_tool("get_release_candidate_report")
@enforce_tool_permission("get_release_candidate_report")
def get_release_candidate_report() -> str:
    """Generate the O.R.I.O.N. v4.0 release-candidate report."""
    return render_release_candidate_report()
