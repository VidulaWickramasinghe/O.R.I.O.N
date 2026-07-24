"""Permission-aware tools for local O.R.I.O.N. patch-release preparation."""

from agents import function_tool

from core.patch_release import (
    complete_patch_release as complete_patch_release_core,
    generate_patch_release_package as generate_patch_release_package_core,
    render_patch_release_report,
    save_patch_release_report as save_patch_release_report_core,
    start_patch_release as start_patch_release_core,
)
from core.tool_logger import instrument_tool
from core.tool_permissions import enforce_tool_permission


@function_tool
@instrument_tool("get_patch_release_report")
@enforce_tool_permission("get_patch_release_report")
def get_patch_release_report() -> str:
    return render_patch_release_report()


@function_tool
@instrument_tool("save_patch_release_report")
@enforce_tool_permission("save_patch_release_report")
def save_patch_release_report() -> str:
    return str(save_patch_release_report_core())


@function_tool
@instrument_tool("start_patch_release")
@enforce_tool_permission("start_patch_release")
def start_patch_release(
    patch_version: str = "v6.0.1",
    patch_type: str = "maintenance",
    reason: str = "Post-release maintenance patch.",
) -> str:
    return str(start_patch_release_core(patch_version, patch_type, reason))


@function_tool
@instrument_tool("complete_patch_release")
@enforce_tool_permission("complete_patch_release")
def complete_patch_release(reason: str = "Patch release workflow completed locally.") -> str:
    return str(complete_patch_release_core(reason))


@function_tool
@instrument_tool("generate_patch_release_package")
@enforce_tool_permission("generate_patch_release_package")
def generate_patch_release_package() -> str:
    return str(generate_patch_release_package_core())
