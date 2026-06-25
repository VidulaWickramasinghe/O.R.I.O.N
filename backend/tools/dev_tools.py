import os
import shlex
import subprocess
from pathlib import Path
from agents import function_tool
from core.tool_logger import instrument_tool


PROJECT_ROOT = Path.cwd()
SAFE_BASE = PROJECT_ROOT


DANGEROUS_KEYWORDS = [
    "rm",
    "sudo",
    "mkfs",
    "shutdown",
    "reboot",
    "passwd",
    "chown",
    "chmod",
    "dd",
    "curl",
    "wget",
    "scp",
    "ssh",
    ">",
    ">>",
    "|",
    "&&",
    ";",
]


ALLOWED_COMMANDS = [
    ["pwd"],
    ["ls"],
    ["git", "status"],
    ["git", "branch"],
    ["python", "--version"],
    ["python3", "--version"],
    ["node", "--version"],
    ["npm", "--version"],
    ["pip", "--version"],
    ["pip", "list"],
]


def _resolve_safe_path(path: str) -> Path:
    target = (SAFE_BASE / path).resolve()

    if not str(target).startswith(str(SAFE_BASE.resolve())):
        raise ValueError("Blocked unsafe path access.")

    return target


def _is_safe_command(command: str) -> bool:
    lowered = command.lower()

    for keyword in DANGEROUS_KEYWORDS:
        if keyword in lowered.split() or keyword in lowered:
            return False

    try:
        parts = shlex.split(command)
    except ValueError:
        return False

    for allowed in ALLOWED_COMMANDS:
        if parts[: len(allowed)] == allowed:
            return True

    return False


@function_tool
@instrument_tool("get_system_status")
def get_system_status() -> str:
    """
    Get basic local development system status.
    """
    return f"""
Current working directory: {Path.cwd()}
Python executable available: yes
O.R.I.O.N. safe developer tools: online
Safe base path: {SAFE_BASE}
""".strip()


@function_tool
@instrument_tool("list_directory")
def list_directory(path: str = ".") -> str:
    """
    Safely list files and folders inside the O.R.I.O.N. project directory.
    """
    try:
        target = _resolve_safe_path(path)

        if not target.exists():
            return "Path does not exist."

        if not target.is_dir():
            return "Path is not a directory."

        items = sorted(target.iterdir())

        if not items:
            return "Directory is empty."

        lines = []
        for item in items:
            item_type = "DIR " if item.is_dir() else "FILE"
            lines.append(f"{item_type} - {item.relative_to(SAFE_BASE)}")

        return "\n".join(lines)

    except Exception as error:
        return f"Directory listing failed: {error}"


@function_tool
@instrument_tool("read_project_file")
def read_project_file(path: str) -> str:
    """
    Safely read a text file inside the O.R.I.O.N. project directory.
    """
    try:
        target = _resolve_safe_path(path)

        if not target.exists():
            return "File does not exist."

        if not target.is_file():
            return "Path is not a file."

        if target.stat().st_size > 100_000:
            return "File is too large to read safely."

        return target.read_text(encoding="utf-8")

    except UnicodeDecodeError:
        return "File is not a readable UTF-8 text file."
    except Exception as error:
        return f"File read failed: {error}"


@function_tool
@instrument_tool("write_project_file")
def write_project_file(path: str, content: str) -> str:
    """
    Safely create or update a text file inside backend/data/generated_files.
    """
    try:
        safe_output_dir = SAFE_BASE / "backend" / "data" / "generated_files"
        safe_output_dir.mkdir(parents=True, exist_ok=True)

        filename = Path(path).name
        target = safe_output_dir / filename

        target.write_text(content, encoding="utf-8")

        return f"File written safely: {target}"

    except Exception as error:
        return f"File write failed: {error}"


@function_tool
@instrument_tool("run_safe_command")
def run_safe_command(command: str) -> str:
    """
    Run only approved non-destructive developer commands.
    """
    if not _is_safe_command(command):
        return f"Blocked unsafe or unapproved command: {command}"

    try:
        parts = shlex.split(command)

        result = subprocess.run(
            parts,
            cwd=SAFE_BASE,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )

        output = result.stdout.strip()
        error = result.stderr.strip()

        if error:
            return f"Command completed with messages:\n{error}\n\nOutput:\n{output}"

        return output or "Command completed with no output."

    except subprocess.TimeoutExpired:
        return "Command timed out."
    except Exception as error:
        return f"Command failed: {error}"
