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

	get_system_status,
        list_directory,
        read_project_file,
        write_project_file,
        run_safe_command,
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
