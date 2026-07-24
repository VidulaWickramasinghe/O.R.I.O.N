import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.approvals import create_approval_request
from core.workspace_manager import (
    detect_workspace_stack,
    get_workspace_record,
    inspect_workspace_structure,
)

DATA_DIR = BACKEND_DIR / "data"
REPORTS_DIR = DATA_DIR / "developer_reports"
DB_PATH = DATA_DIR / "orion_developer_agent.sqlite"

DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

COMMON_IMPORTANT_FILES = [
    "README.md",
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "frontend/package.json",
    "backend/api_main.py",
    "backend/main.py",
    "src/app/page.tsx",
    "src/app/globals.css",
    "next.config.js",
    "next.config.ts",
    "vite.config.ts",
    "vite.config.js",
    "tsconfig.json",
]

IGNORED_SCAN_PARTS = {
    ".git",
    "node_modules",
    ".next",
    ".venv",
    "__pycache__",
    "dist",
    "build",
}


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_developer_agent_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS developer_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                report_type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                artifact_path TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _safe_slug(value: str) -> str:
    return (
        value.lower()
        .strip()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
        .replace(":", "_")
    )[:80] or "developer_report"


def _get_workspace_root(workspace_id: int) -> Path:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        raise ValueError("Workspace not found.")

    root = Path(workspace["path"]).expanduser().resolve()

    if not root.exists() or not root.is_dir():
        raise ValueError(f"Workspace path is invalid: {root}")

    return root


def _safe_workspace_file(root: Path, relative_path: str) -> Path:
    target = (root / relative_path).resolve()

    if not str(target).startswith(str(root)):
        raise ValueError("Blocked unsafe workspace path access.")

    return target


def _read_existing_file_preview(root: Path, relative_path: str, limit: int = 5000) -> str:
    target = _safe_workspace_file(root, relative_path)

    if not target.exists() or not target.is_file():
        return "File not found."

    if target.stat().st_size > 160_000:
        return "File too large to preview safely."

    return target.read_text(encoding="utf-8", errors="ignore")[:limit]


def _discover_important_files(root: Path) -> List[str]:
    found = []

    for relative in COMMON_IMPORTANT_FILES:
        if (root / relative).exists():
            found.append(relative)

    for pattern in ["*.md", "*.ts", "*.tsx", "*.py"]:
        for file_path in root.rglob(pattern):
            if any(part in IGNORED_SCAN_PARTS for part in file_path.parts):
                continue

            try:
                relative = str(file_path.relative_to(root))
            except ValueError:
                continue

            if relative not in found:
                found.append(relative)

            if len(found) >= 30:
                return found

    return found


def create_developer_report_record(
    workspace_id: int,
    report_type: str,
    title: str,
    content: str,
) -> Dict[str, Any]:
    init_developer_agent_db()

    workspace = get_workspace_record(workspace_id)
    workspace_name = workspace["name"] if workspace else f"workspace_{workspace_id}"
    file_name = (
        f"{_safe_slug(workspace_name)}_{_safe_slug(report_type)}_"
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    )
    artifact_path = REPORTS_DIR / file_name
    artifact_path.write_text(content, encoding="utf-8")

    now = _now()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO developer_reports
            (workspace_id, report_type, title, content, artifact_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (workspace_id, report_type, title, content, str(artifact_path), now),
        )
        conn.commit()
        report_id = int(cursor.lastrowid)

    return {
        "id": report_id,
        "workspace_id": workspace_id,
        "report_type": report_type,
        "title": title,
        "content": content,
        "artifact_path": str(artifact_path),
        "created_at": now,
    }


def list_developer_reports(
    workspace_id: Optional[int] = None,
    limit: int = 30,
) -> List[Dict[str, Any]]:
    init_developer_agent_db()

    with get_connection() as conn:
        conn.row_factory = sqlite3.Row

        if workspace_id:
            rows = conn.execute(
                """
                SELECT *
                FROM developer_reports
                WHERE workspace_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (workspace_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT *
                FROM developer_reports
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

    return [dict(row) for row in rows]


def inspect_workspace_for_development(workspace_id: int) -> str:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        return "Workspace not found."

    stack = detect_workspace_stack(workspace_id)
    structure = inspect_workspace_structure(workspace_id, max_depth=2)
    root = _get_workspace_root(workspace_id)
    important_files = _discover_important_files(root)
    file_previews = []

    for relative in important_files[:10]:
        preview = _read_existing_file_preview(root, relative, limit=1800)
        file_previews.append(f"## {relative}\n\n```text\n{preview}\n```")

    file_preview_text = "\n\n".join(file_previews) or "No important files discovered."
    content = f"""# Developer Workspace Inspection

Workspace ID: {workspace['id']}
Name: {workspace['name']}
Path: {workspace['path']}
Status: {workspace['status']}
Generated: {_now()}

## Detected Stack

{', '.join(stack.get('detected_stack', [])) or 'No stack detected.'}

## Key Files

{', '.join(stack.get('key_files', [])) or 'No key files detected.'}

## Workspace Structure

```text
{structure}
```

## Important File Previews

{file_preview_text}

## Initial Developer Notes

- Review detected stack and key files.
- Check README, package files, backend entry files, frontend app files, and route handlers.
- Use approval-gated edits only.
- Run safe checks after planned changes.
"""
    create_developer_report_record(
        workspace_id=workspace_id,
        report_type="workspace_inspection",
        title=f"Developer inspection for {workspace['name']}",
        content=content,
    )
    return content


def diagnose_workspace_issue(workspace_id: int, issue_description: str) -> str:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        return "Workspace not found."

    stack = detect_workspace_stack(workspace_id)
    root = _get_workspace_root(workspace_id)
    important_files = _discover_important_files(root)
    relevant_previews = []

    for relative in important_files[:14]:
        preview = _read_existing_file_preview(root, relative, limit=2200)
        relevant_previews.append(f"## {relative}\n\n```text\n{preview}\n```")

    content = f"""# Developer Diagnosis Report

Workspace ID: {workspace['id']}
Workspace: {workspace['name']}
Path: {workspace['path']}
Generated: {_now()}

## Issue Description

{issue_description}

## Detected Stack

{', '.join(stack.get('detected_stack', [])) or 'No stack detected.'}

## Relevant File Previews

{chr(10).join(relevant_previews)}

## Diagnosis Framework

Use this report to reason about:

- What the user expected.
- What is currently happening.
- Which files are likely involved.
- Whether this is frontend, backend, environment, dependency, routing, state, build, or integration related.
- What safe patch plan should be proposed before editing.

## Safety

No project files were modified by this diagnosis.
"""
    create_developer_report_record(
        workspace_id=workspace_id,
        report_type="diagnosis",
        title=f"Diagnosis for {workspace['name']}",
        content=content,
    )
    return content


def create_patch_plan(
    workspace_id: int,
    issue_description: str,
    target_files: Optional[List[str]] = None,
) -> str:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        return "Workspace not found."

    root = _get_workspace_root(workspace_id)
    files = target_files or _discover_important_files(root)[:8]
    file_previews = []

    for relative in files[:12]:
        preview = _read_existing_file_preview(root, relative, limit=2600)
        file_previews.append(f"## {relative}\n\n```text\n{preview}\n```")

    content = f"""# Approval-Gated Patch Plan

Workspace ID: {workspace['id']}
Workspace: {workspace['name']}
Path: {workspace['path']}
Generated: {_now()}

## Issue / Objective

{issue_description}

## Candidate Files

{chr(10).join(f'- {file}' for file in files)}

## File Context

{chr(10).join(file_previews)}

## Patch Plan Template

Before modifying files, prepare:

1. Exact file path.
2. Current problem in that file.
3. Proposed change.
4. Why the change is safe.
5. Expected result.
6. Validation command.

## Recommended Safe Validation Commands

```bash
python -m py_compile backend/api_main.py backend/main.py
cd frontend && npm run build && cd ..
```

## Safety

This is only a patch plan. No files were edited. Use approval-gated write actions before applying changes.
"""
    create_developer_report_record(
        workspace_id=workspace_id,
        report_type="patch_plan",
        title=f"Patch plan for {workspace['name']}",
        content=content,
    )
    return content


def request_workspace_file_patch(
    workspace_id: int,
    relative_path: str,
    new_content: str,
    reason: str,
) -> int:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        raise ValueError("Workspace not found.")

    root = _get_workspace_root(workspace_id)
    target = _safe_workspace_file(root, relative_path)
    existing_content = ""

    if target.exists() and target.is_file():
        existing_content = target.read_text(encoding="utf-8", errors="ignore")[:8000]

    return create_approval_request(
        action_type="APPLY_WORKSPACE_FILE_PATCH",
        title=f"Patch file: {relative_path}",
        description="O.R.I.O.N. requests permission to apply a workspace file patch.",
        payload={
            "workspace_id": workspace_id,
            "workspace_path": str(root),
            "relative_path": relative_path,
            "target_path": str(target),
            "new_content": new_content,
            "existing_preview": existing_content,
            "reason": reason,
        },
        risk_level="high",
        source="developer_agent",
    )


def execute_approved_workspace_patch(approval: Dict[str, Any]) -> str:
    payload = approval.get("payload", {})
    workspace_path = Path(payload["workspace_path"]).expanduser().resolve()
    target_path = Path(payload["target_path"]).expanduser().resolve()
    relative_path = payload["relative_path"]
    new_content = payload["new_content"]

    if not str(target_path).startswith(str(workspace_path)):
        return "Blocked unsafe patch path."

    target_path.parent.mkdir(parents=True, exist_ok=True)
    backup_path = target_path.with_suffix(target_path.suffix + ".orion_backup")

    if target_path.exists():
        backup_path.write_text(
            target_path.read_text(encoding="utf-8", errors="ignore"),
            encoding="utf-8",
        )

    target_path.write_text(new_content, encoding="utf-8")

    if backup_path.exists():
        return f"Workspace patch applied: {relative_path}\nBackup: {backup_path}"

    return f"Workspace patch applied: {relative_path}\nBackup: No previous file backup needed."
