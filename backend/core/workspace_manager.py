import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DB_PATH = DATA_DIR / "orion_workspaces.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)

IGNORED_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    ".next",
    "out",
    "dist",
    "build",
    "__pycache__",
    ".idea",
    ".vscode",
}

IGNORED_FILES = {
    ".env",
    "backend/.env",
}


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_workspace_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                description TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def register_workspace_record(
    name: str,
    path: str,
    description: str = "",
    status: str = "active",
) -> int:
    init_workspace_db()

    resolved = Path(path).expanduser().resolve()

    if not resolved.exists():
        raise ValueError(f"Workspace path does not exist: {resolved}")

    if not resolved.is_dir():
        raise ValueError(f"Workspace path is not a directory: {resolved}")

    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO workspaces
            (name, path, description, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (name, str(resolved), description, status, now, now),
        )

        conn.commit()

        existing = conn.execute(
            """
            SELECT id FROM workspaces WHERE path = ?
            """,
            (str(resolved),),
        ).fetchone()

    return int(existing[0])


def list_workspace_records(limit: int = 30) -> List[Dict[str, Any]]:
    init_workspace_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, name, path, description, status, created_at, updated_at
            FROM workspaces
            ORDER BY id ASC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_workspace_record(workspace_id: int) -> Optional[Dict[str, Any]]:
    init_workspace_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT id, name, path, description, status, created_at, updated_at
            FROM workspaces
            WHERE id = ?
            """,
            (workspace_id,),
        ).fetchone()

    if not row:
        return None

    return dict(row)


def inspect_workspace_structure(workspace_id: int, max_depth: int = 2) -> str:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        return f"Workspace {workspace_id} not found."

    root = Path(workspace["path"]).resolve()
    lines = [f"Workspace: {workspace['name']}", f"Path: {root}", ""]

    def walk(path: Path, depth: int) -> None:
        if depth > max_depth:
            return

        try:
            items = sorted(path.iterdir(), key=lambda item: (item.is_file(), item.name.lower()))
        except PermissionError:
            return

        for item in items:
            rel = item.relative_to(root)

            if item.name in IGNORED_DIRS:
                continue

            if str(rel) in IGNORED_FILES or item.name == ".env":
                lines.append(f"{'  ' * depth}- {rel}  [hidden]")
                continue

            suffix = "/" if item.is_dir() else ""
            lines.append(f"{'  ' * depth}- {rel}{suffix}")

            if item.is_dir():
                walk(item, depth + 1)

    walk(root, 0)

    return "\n".join(lines)


def detect_workspace_stack(workspace_id: int) -> Dict[str, Any]:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        return {
            "workspace_id": workspace_id,
            "summary": "Workspace not found.",
            "detected_stack": [],
            "key_files": [],
        }

    root = Path(workspace["path"]).resolve()
    stack = []
    key_files = []

    checks = {
        "Next.js": ["next.config.js", "next.config.ts"],
        "React": ["package.json"],
        "TypeScript": ["tsconfig.json"],
        "Tailwind CSS": ["tailwind.config.js", "tailwind.config.ts"],
        "Python": ["requirements.txt", "pyproject.toml"],
        "FastAPI": ["backend/api_main.py"],
        "Docker": ["Dockerfile", "docker-compose.yml"],
        "Git": [".git"],
    }

    for tech, files in checks.items():
        for file_name in files:
            if (root / file_name).exists():
                stack.append(tech)
                key_files.append(file_name)
                break

    if (root / "frontend" / "package.json").exists():
        stack.append("Next.js frontend")
        key_files.append("frontend/package.json")

    if (root / "backend").exists():
        stack.append("Python backend")
        key_files.append("backend/")

    stack = list(dict.fromkeys(stack))
    key_files = list(dict.fromkeys(key_files))

    return {
        "workspace_id": workspace_id,
        "name": workspace["name"],
        "path": workspace["path"],
        "summary": f"{workspace['name']} uses: {', '.join(stack) if stack else 'No known stack detected.'}",
        "detected_stack": stack,
        "key_files": key_files,
    }


def summarize_workspace(workspace_id: int) -> Dict[str, Any]:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        return {
            "workspace_id": workspace_id,
            "name": "workspace not found",
            "summary": "Workspace not found.",
            "path": "",
            "detected_stack": [],
            "key_files": [],
        }

    stack = detect_workspace_stack(workspace_id)

    return {
        "workspace_id": workspace_id,
        "name": workspace["name"],
        "path": workspace["path"],
        "description": workspace["description"],
        "status": workspace["status"],
        "summary": stack["summary"],
        "detected_stack": stack["detected_stack"],
        "key_files": stack["key_files"],
    }


def read_workspace_file(workspace_id: int, relative_file_path: str) -> str:
    """
    Safely reads a file from within a workspace given its relative path.
    Prevents directory traversal out of the workspace root.
    """
    workspace = get_workspace_record(workspace_id)
    if not workspace:
        raise ValueError(f"Workspace with ID {workspace_id} does not exist.")

    root_path = Path(workspace["path"]).resolve()
    target_file = (root_path / relative_file_path).resolve()

    # Security check: Ensure the file path remains strictly inside the workspace directory
    if not str(target_file).startswith(str(root_path)):
        raise PermissionError("Access denied: Target file is outside the workspace container.")

    if not target_file.exists():
        raise FileNotFoundError(f"The file '{relative_file_path}' was not found in the workspace.")

    if not target_file.is_file():
        raise IsADirectoryError(f"'{relative_file_path}' is a directory, not a file.")

    # Guard hidden/env file reads if necessary
    if target_file.name == ".env" or target_file.name in IGNORED_FILES:
        raise PermissionError("Access denied: Reading environment files is prohibited.")

    try:
        return target_file.read_text(encoding="utf-8")
    except Exception as e:
        return f"Error reading file: {str(e)}"


# -------------------------------------------------------------
# ALIASES: Resolves name naming discrepancies across modules
# -------------------------------------------------------------
inspect_workspace_tree = inspect_workspace_structure
summarize_workspace_record = summarize_workspace
