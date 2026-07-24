import asyncio
import os
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

from agents import Agent, Runner, SQLiteSession

from core.prompt import ORION_SYSTEM_PROMPT
from core.context_engine import prepare_context_enriched_input
from tools.safe_tools import create_note, read_note, save_activity_log, list_notes
from tools.project_tools import (
    register_project,
    list_projects,
    read_project,
    update_project_status,
    add_project_note,
    save_project_roadmap,
    save_portfolio_summary,
)

from tools.dev_tools import (
    get_system_status,
    list_directory,
    read_project_file,
    write_project_file,
    run_safe_command,
)

from tools.memory_tools import (
    remember_information,
    search_persistent_memory,
    list_recent_persistent_memory,
)

from tools.mission_tools import (
    create_mission,
    list_missions,
    read_mission,
    update_mission_status,
    update_mission_step_status,
    add_mission_step,
)

from tools.workspace_tools import (
    register_workspace,
    list_workspaces,
    read_workspace,
    inspect_workspace,
    read_workspace_key_file,
    detect_workspace_tech_stack,
    summarize_workspace,
)

from tools.github_release_tools import (
    inspect_github_release_readiness,
    generate_github_release_notes_tool,
    generate_github_release_checklist,
    suggest_release_commit_message,
)

from tools.browser_research_tools import (
    research_web_page,
    compare_research_pages,
    save_web_research,
)

from tools.context_tools import (
    retrieve_project_context,
)

from tools.desktop_tools import (
    open_workspace_in_vscode,
    open_workspace_folder,
    open_url_in_browser,
    start_workspace_dev_server,
)

from tools.portfolio_demo_tools import (
    get_demo_readiness_report,
    generate_portfolio_case_study_tool,
    generate_demo_script_tool,
    generate_screenshot_checklist_tool,
    generate_portfolio_release_pack,
    set_demo_mode,
)

from tools.system_doctor_tools import run_system_doctor_tool

from tools.knowledge_tools import (
    index_knowledge_document,
    index_knowledge_folder_tool,
    list_knowledge_documents_tool,
    search_local_knowledge,
    summarize_knowledge_document_tool,
)

from tools.vector_memory_tools import (
    rebuild_vector_memory_index,
    semantic_memory_search,
    list_vector_memory_items,
)

from tools.workflow_blueprint_tools import (
    list_workflow_blueprints,
    read_workflow_blueprint,
    create_mission_from_workflow_blueprint,
)

from tools.developer_agent_tools import (
    inspect_workspace_for_development_tool,
    diagnose_workspace_issue_tool,
    create_workspace_patch_plan,
    request_workspace_file_patch_tool,
    list_developer_reports_tool,
)

from tools.dashboard_intelligence_tools import (
    get_dashboard_intelligence_report,
)

from tools.notification_tools import (
    create_local_reminder,
    list_local_reminders,
    complete_local_reminder,
    refresh_due_reminders_tool,
    generate_startup_briefing_tool,
)

from tools.user_settings_tools import (
    list_user_profile_settings,
    update_user_profile_setting,
    reset_user_profile_settings,
    get_user_profile_summary,
)

from tools.plugin_registry_tools import (
    list_orion_plugins,
    inspect_orion_plugin,
    set_orion_plugin_enabled,
    get_plugin_registry_report,
)

from tools.backend_sidecar_tools import (
    get_backend_sidecar_status,
    start_backend_sidecar_tool,
    stop_backend_sidecar_tool,
    restart_backend_sidecar_tool,
)

from tools.tool_permission_tools import (
    get_tool_permission_report,
    check_tool_permission,
    get_tool_permission_metrics_tool,
    list_tool_permission_matrix,
)

from tools.tool_audit_tools import (
    get_tool_audit_report,
    list_tool_audit_events_tool,
    get_tool_audit_metrics_tool,
)

from tools.security_policy_tools import (
    list_security_profiles_tool,
    get_active_security_policy_tool,
    apply_security_profile_tool,
    get_security_policy_report,
)


load_dotenv(dotenv_path="backend/.env")

console = Console()


orion = Agent(
    name="O.R.I.O.N.",
    instructions=ORION_SYSTEM_PROMPT,
    tools=[
        create_note,
        read_note,
        save_activity_log,
        list_notes,

        register_project,
        list_projects,
        read_project,
        update_project_status,
        add_project_note,
        save_project_roadmap,
        save_portfolio_summary,
        run_system_doctor_tool,

	get_system_status,
        list_directory,
        read_project_file,
        write_project_file,
        run_safe_command,
        index_knowledge_document,
        index_knowledge_folder_tool,
        list_knowledge_documents_tool,
        search_local_knowledge,
        summarize_knowledge_document_tool,
        rebuild_vector_memory_index,
        semantic_memory_search,
        list_vector_memory_items,
        list_workflow_blueprints,
        read_workflow_blueprint,
        create_mission_from_workflow_blueprint,
        inspect_workspace_for_development_tool,
        diagnose_workspace_issue_tool,
        create_workspace_patch_plan,
        request_workspace_file_patch_tool,
        list_developer_reports_tool,
        get_dashboard_intelligence_report,
        create_local_reminder,
        list_local_reminders,
        complete_local_reminder,
        refresh_due_reminders_tool,
        generate_startup_briefing_tool,
        list_user_profile_settings,
        update_user_profile_setting,
        reset_user_profile_settings,
        get_user_profile_summary,
        list_orion_plugins,
        inspect_orion_plugin,
        set_orion_plugin_enabled,
        get_plugin_registry_report,
        get_backend_sidecar_status,
        start_backend_sidecar_tool,
        stop_backend_sidecar_tool,
        restart_backend_sidecar_tool,
        get_tool_permission_report,
        check_tool_permission,
        get_tool_permission_metrics_tool,
        list_tool_permission_matrix,
        get_tool_audit_report,
        list_tool_audit_events_tool,
        get_tool_audit_metrics_tool,
    ],
)


session = SQLiteSession("orion_core_v03")


async def run_orion():
    console.print(
        Panel.fit(
            "O.R.I.O.N. Core v0.3 Online\nProject Command Center Activated\nThink. Plan. Act. Learn.",
            title="Operational Response and Intelligent Orchestration Network",
            border_style="cyan",
        )
    )

    while True:
        user_input = console.input("\n[bold cyan]You:[/bold cyan] ")

        if user_input.lower() in ["exit", "quit", "stop"]:
            console.print("[bold magenta]O.R.I.O.N. shutting down.[/bold magenta]")
            break

        contextual_input = prepare_context_enriched_input(user_input)

        result = await Runner.run(
            orion,
            contextual_input,
            session=session,
        )

        console.print(
            Panel(
                result.final_output,
                title="O.R.I.O.N.",
                border_style="cyan",
            )
        )


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        console.print("[bold red]Missing OPENAI_API_KEY in backend/.env[/bold red]")
    else:
        asyncio.run(run_orion())
