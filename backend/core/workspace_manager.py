import json
import sqlite3
from datetime import datetime
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any, Dict, List, Optional

from core.database import managed_connection
from core.capability_gateway import requires_gateway
from core.runtime_paths import runtime_data_dir
BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = runtime_data_dir()
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

SENSITIVE_DIRECTORY_NAMES = {
    ".aws",
    ".azure",
    ".git",
    ".gnupg",
    ".kube",
    ".ssh",
}

SENSITIVE_FILE_NAMES = {
    ".env",
    ".netrc",
    ".npmrc",
    ".pypirc",
    "authorized_keys",
    "credentials",
    "credentials.json",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
    "id_rsa",
    "known_hosts",
    "secrets.json",
}

SENSITIVE_FILE_SUFFIXES = {
    ".der",
    ".jks",
    ".kdbx",
    ".key",
    ".p12",
    ".pem",
    ".pfx",
}


def get_connection():
    return managed_connection(DB_PATH)


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
                trusted INTEGER NOT NULL DEFAULT 0,
                source_consent INTEGER NOT NULL DEFAULT 0,
                consent_source TEXT DEFAULT '',
                consented_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        columns = {
            str(row[1]) for row in conn.execute("PRAGMA table_info(workspaces)").fetchall()
        }
        migrations = {
            "trusted": "INTEGER NOT NULL DEFAULT 0",
            "source_consent": "INTEGER NOT NULL DEFAULT 0",
            "consent_source": "TEXT DEFAULT ''",
            "consented_at": "TEXT",
        }
        for column, definition in migrations.items():
            if column not in columns:
                conn.execute(f"ALTER TABLE workspaces ADD COLUMN {column} {definition}")
        conn.commit()


def validate_relative_workspace_path(relative_path: str, *, allow_root: bool = False) -> Path:
    """Validate path syntax independently of the host operating system.

    Both POSIX and Windows forms are parsed so a Windows absolute path, drive,
    UNC path, or backslash traversal is rejected even when tests run on macOS
    or Linux.
    """
    if not isinstance(relative_path, str):
        raise TypeError("Workspace paths must be strings.")
    if "\x00" in relative_path:
        raise PermissionError("Workspace path contains a null byte.")

    raw = relative_path.strip()
    if not raw:
        if allow_root:
            return Path(".")
        raise PermissionError("Workspace path must not be empty.")

    windows_path = PureWindowsPath(raw)
    portable_path = PurePosixPath(raw.replace("\\", "/"))
    if portable_path.is_absolute() or windows_path.is_absolute() or windows_path.drive:
        raise PermissionError("Absolute workspace paths are prohibited.")
    if any(part == ".." for part in portable_path.parts):
        raise PermissionError("Parent path traversal is prohibited.")

    parts = tuple(part for part in portable_path.parts if part not in {"", "."})
    if not parts:
        if allow_root:
            return Path(".")
        raise PermissionError("Workspace path must identify a child entry.")
    return Path(*parts)


def is_sensitive_workspace_path(relative_path: str | Path) -> bool:
    portable = PurePosixPath(str(relative_path).replace("\\", "/"))
    lowered_parts = [part.casefold() for part in portable.parts if part not in {"", "."}]
    if any(part in SENSITIVE_DIRECTORY_NAMES for part in lowered_parts[:-1]):
        return True
    if not lowered_parts:
        return False

    filename = lowered_parts[-1]
    if filename in SENSITIVE_FILE_NAMES or filename.startswith(".env."):
        return True
    return PurePosixPath(filename).suffix.casefold() in SENSITIVE_FILE_SUFFIXES


def _workspace_root(workspace: Dict[str, Any]) -> Path:
    root = Path(str(workspace["path"])).expanduser().resolve(strict=True)
    if not root.is_dir():
        raise PermissionError("The registered workspace root is no longer a directory.")
    return root


def get_trusted_workspace_record(workspace_id: int) -> Dict[str, Any]:
    workspace = get_workspace_record(workspace_id)
    if not workspace:
        raise ValueError(f"Workspace with ID {workspace_id} does not exist.")
    if not bool(workspace.get("trusted")) or not bool(workspace.get("source_consent")):
        raise PermissionError(
            "Workspace access requires an explicitly trusted root with source consent."
        )
    if workspace.get("status") != "active":
        raise PermissionError("Workspace access requires an active workspace.")
    _workspace_root(workspace)
    return workspace


def resolve_workspace_path(
    workspace_id: int,
    relative_path: str,
    *,
    must_exist: bool = True,
    require_file: bool = False,
    require_directory: bool = False,
    allow_root: bool = False,
) -> Path:
    """Resolve a consented workspace-relative path and fail closed on escape."""
    workspace = get_trusted_workspace_record(workspace_id)
    root = _workspace_root(workspace)
    relative = validate_relative_workspace_path(relative_path, allow_root=allow_root)

    if is_sensitive_workspace_path(relative):
        raise PermissionError("Access to sensitive workspace files is prohibited.")

    target = (root / relative).resolve(strict=False)
    try:
        target.relative_to(root)
    except ValueError as error:
        raise PermissionError("Workspace path escapes the registered trusted root.") from error

    if must_exist and not target.exists():
        raise FileNotFoundError(f"Workspace path was not found: {relative_path}")
    if require_file and (not target.exists() or not target.is_file()):
        raise FileNotFoundError(f"Workspace file was not found: {relative_path}")
    if require_directory and (not target.exists() or not target.is_dir()):
        raise NotADirectoryError(f"Workspace directory was not found: {relative_path}")
    return target


@requires_gateway
def register_workspace_record(
    name: str,
    path: str,
    description: str = "",
    status: str = "active",
    trusted: bool = False,
    source_consent: bool = False,
    consent_source: str = "",
) -> int:
    init_workspace_db()

    if not trusted or not source_consent:
        raise PermissionError(
            "Workspace registration requires explicit trust and source consent."
        )

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
            (name, path, description, status, trusted, source_consent,
             consent_source, consented_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                status = excluded.status,
                trusted = excluded.trusted,
                source_consent = excluded.source_consent,
                consent_source = excluded.consent_source,
                consented_at = excluded.consented_at,
                updated_at = excluded.updated_at
            """,
            (
                name,
                str(resolved),
                description,
                status,
                int(trusted),
                int(source_consent),
                str(consent_source or "explicit_user_consent"),
                now,
                now,
                now,
            ),
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
            SELECT id, name, path, description, status, trusted, source_consent,
                   consent_source, consented_at, created_at, updated_at
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
            SELECT id, name, path, description, status, trusted, source_consent,
                   consent_source, consented_at, created_at, updated_at
            FROM workspaces
            WHERE id = ?
            """,
            (workspace_id,),
        ).fetchone()

    if not row:
        return None

    return dict(row)


def inspect_workspace_structure(workspace_id: int, max_depth: int = 2) -> str:
    workspace = get_trusted_workspace_record(workspace_id)
    root = _workspace_root(workspace)
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

            if str(rel) in IGNORED_FILES or is_sensitive_workspace_path(rel):
                lines.append(f"{'  ' * depth}- {rel}  [hidden]")
                continue

            try:
                resolved_item = item.resolve(strict=True)
                resolved_item.relative_to(root)
            except (FileNotFoundError, OSError, ValueError):
                lines.append(f"{'  ' * depth}- {rel}  [blocked symlink]")
                continue

            suffix = "/" if resolved_item.is_dir() else ""
            lines.append(f"{'  ' * depth}- {rel}{suffix}")

            if resolved_item.is_dir() and not item.is_symlink():
                walk(resolved_item, depth + 1)

    walk(root, 0)

    return "\n".join(lines)


def detect_workspace_stack(workspace_id: int) -> Dict[str, Any]:
    try:
        workspace = get_trusted_workspace_record(workspace_id)
    except (ValueError, PermissionError):
        return {
            "workspace_id": workspace_id,
            "summary": "Workspace not found.",
            "detected_stack": [],
            "key_files": [],
        }

    root = _workspace_root(workspace)
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
    target_file = resolve_workspace_path(
        workspace_id,
        relative_file_path,
        must_exist=True,
        require_file=True,
    )

    try:
        return target_file.read_text(encoding="utf-8")
    except Exception as e:
        return f"Error reading file: {str(e)}"


# -------------------------------------------------------------
# ALIASES: Resolves name naming discrepancies across modules
# -------------------------------------------------------------
inspect_workspace_tree = inspect_workspace_structure
summarize_workspace_record = summarize_workspace
