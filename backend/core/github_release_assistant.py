import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.workspace_manager import get_workspace_record


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
RELEASE_DIR = DATA_DIR / "github_release_assistant"

RELEASE_DIR.mkdir(parents=True, exist_ok=True)


def _safe_slug(value: str) -> str:
    return (
        value.lower()
        .strip()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
        .replace(":", "_")
    )


def _get_workspace_root(workspace_id: int) -> Optional[Path]:
    workspace = get_workspace_record(workspace_id)

    if not workspace:
        return None

    root = Path(workspace["path"]).expanduser().resolve()

    if not root.exists() or not root.is_dir():
        return None

    return root


def _run_git(root: Path, args: List[str], timeout: int = 20) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )

        output = result.stdout.strip()
        error = result.stderr.strip()

        if result.returncode != 0:
            return error or output or "Git command failed."

        return output or "No output."

    except subprocess.TimeoutExpired:
        return "Git command timed out."
    except Exception as error:
        return f"Git command failed: {error}"


def _read_preview(root: Path, file_name: str, limit: int = 1400) -> str:
    target = (root / file_name).resolve()

    if not str(target).startswith(str(root)):
        return "Blocked unsafe file path."

    if not target.exists() or not target.is_file():
        return "File not found."

    try:
        content = target.read_text(encoding="utf-8")
        return content[:limit] + ("..." if len(content) > limit else "")
    except Exception as error:
        return f"Could not read {file_name}: {error}"


def inspect_release_readiness(workspace_id: int) -> str:
    root = _get_workspace_root(workspace_id)
    workspace = get_workspace_record(workspace_id)

    if not root or not workspace:
        return "Workspace not found or invalid."

    is_git_repo = (root / ".git").exists()

    branch = _run_git(root, ["branch", "--show-current"]) if is_git_repo else "Not a Git repository."
    status = _run_git(root, ["status", "--short"]) if is_git_repo else "Not a Git repository."
    recent_commits = _run_git(root, ["log", "--oneline", "-n", "8"]) if is_git_repo else "Not a Git repository."
    diff_stat = _run_git(root, ["diff", "--stat"]) if is_git_repo else "Not a Git repository."

    readme_preview = _read_preview(root, "README.md")
    changelog_preview = _read_preview(root, "CHANGELOG.md")
    package_preview = _read_preview(root, "frontend/package.json")
    requirements_preview = _read_preview(root, "requirements.txt")
    gitignore_preview = _read_preview(root, ".gitignore")

    status_label = "clean" if status == "No output." else "changes_detected"

    return "\n".join([
        "# GitHub Release Readiness Report",
        "",
        f"Workspace: {workspace['name']}",
        f"Path: {workspace['path']}",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "## Repository Status",
        "",
        f"Git Repository: {is_git_repo}",
        f"Current Branch: {branch}",
        f"Working Tree: {status_label}",
        "",
        "## Changed Files",
        "",
        "```text",
        status,
        "```",
        "",
        "## Diff Summary",
        "",
        "```text",
        diff_stat,
        "```",
        "",
        "## Recent Commits",
        "",
        "```text",
        recent_commits,
        "```",
        "",
        "## README Preview",
        "",
        "```markdown",
        readme_preview,
        "```",
        "",
        "## CHANGELOG Preview",
        "",
        "```markdown",
        changelog_preview,
        "```",
        "",
        "## frontend/package.json Preview",
        "",
        "```json",
        package_preview,
        "```",
        "",
        "## requirements.txt Preview",
        "",
        "```text",
        requirements_preview,
        "```",
        "",
        "## .gitignore Preview",
        "",
        "```gitignore",
        gitignore_preview,
        "```",
        "",
        "## Release Readiness Checklist",
        "",
        "- README is updated",
        "- CHANGELOG includes latest version",
        "- `.env` is ignored",
        "- Screenshots are added",
        "- Frontend build passes",
        "- Backend Python compile check passes",
        "- Demo script is ready",
        "- Commit message is prepared",
        "- GitHub repository description is ready",
    ]).strip()


def save_release_artifact(
    workspace_id: int,
    file_name: str,
    content: str,
) -> str:
    workspace = get_workspace_record(workspace_id)

    workspace_slug = _safe_slug(
        workspace["name"] if workspace else f"workspace_{workspace_id}"
    )

    output_dir = RELEASE_DIR / workspace_slug
    output_dir.mkdir(parents=True, exist_ok=True)

    safe_name = _safe_slug(file_name)

    if not safe_name.endswith(".md"):
        safe_name += ".md"

    file_path = output_dir / safe_name
    file_path.write_text(content, encoding="utf-8")

    return str(file_path)


def generate_github_release_notes(
    workspace_id: int,
    release_version: str,
) -> Dict[str, Any]:
    readiness = inspect_release_readiness(workspace_id)
    workspace = get_workspace_record(workspace_id)

    title = workspace["name"] if workspace else f"Workspace {workspace_id}"

    content = "\n".join([
        f"# {title} — GitHub Release Notes",
        "",
        "## Release",
        "",
        release_version,
        "",
        "## Summary",
        "",
        "This release prepares the project for GitHub and portfolio presentation. It includes system documentation, release structure, safety notes, dashboard improvements, workspace management, and developer workflow features.",
        "",
        "## Highlights",
        "",
        "- AI assistant backend",
        "- Aurora OS dashboard",
        "- Project memory",
        "- Persistent memory",
        "- Mission planner",
        "- Approval-gated command execution",
        "- Controlled mission execution",
        "- Mission run history and reports",
        "- Workspace manager",
        "- GitHub release assistant",
        "",
        "## Release Readiness Context",
        "",
        readiness,
        "",
        "## Suggested GitHub Release Description",
        "",
        "O.R.I.O.N. is a personal AI desktop agent with an Aurora OS dashboard, designed for safe AI-assisted productivity, project memory, mission planning, controlled tool execution, workspace inspection, and developer workflow support.",
        "",
        "## Final Pre-Push Checklist",
        "",
        "- Remove sensitive runtime files",
        "- Confirm `.env` is not staged",
        "- Run Python compile checks",
        "- Run frontend production build",
        "- Add screenshots",
        "- Update README",
        "- Update CHANGELOG",
        "- Commit with a clear release message",
    ]).strip()

    artifact_path = save_release_artifact(
        workspace_id=workspace_id,
        file_name=f"{release_version}_github_release_notes.md",
        content=content,
    )

    return {
        "content": content,
        "artifact_path": artifact_path,
    }


def generate_release_checklist(
    workspace_id: int,
    release_version: str,
) -> Dict[str, Any]:
    readiness = inspect_release_readiness(workspace_id)
    workspace = get_workspace_record(workspace_id)

    title = workspace["name"] if workspace else f"Workspace {workspace_id}"

    content = "\n".join([
        f"# {title} — Release Checklist",
        "",
        f"Release: {release_version}",
        "",
        "## 1. Code Quality",
        "",
        "```bash",
        "python -m py_compile backend/api_main.py backend/main.py",
        "cd frontend && npm run build && cd ..",
        "```",
        "",
        "## 2. Security Cleanup",
        "",
        "- Confirm `backend/.env` is not staged",
        "- Confirm API keys are not in README or docs",
        "- Confirm runtime audio/log files are ignored",
        "- Confirm generated databases are handled intentionally",
        "",
        "## 3. Documentation",
        "",
        "- README updated",
        "- CHANGELOG updated",
        "- Installation guide updated",
        "- Architecture docs updated",
        "- Safety model updated",
        "- Demo script updated",
        "",
        "## 4. Screenshots",
        "",
        "- Aurora OS dashboard",
        "- Chat console",
        "- Workspace Manager",
        "- Mission Planner",
        "- Command Approval panel",
        "- Mission Run History",
        "- Backend health endpoint",
        "",
        "## 5. Git",
        "",
        "```bash",
        "git status",
        "git add .",
        f'git commit -m "Release O.R.I.O.N. {release_version}"',
        "git push origin main",
        "```",
        "",
        "Important: commit and push should be done manually or through future approval-gated tools.",
        "",
        "## 6. Current Readiness Report",
        "",
        readiness,
    ]).strip()

    artifact_path = save_release_artifact(
        workspace_id=workspace_id,
        file_name=f"{release_version}_release_checklist.md",
        content=content,
    )

    return {
        "content": content,
        "artifact_path": artifact_path,
    }


def generate_commit_message(
    release_version: str,
    change_summary: str,
) -> str:
    clean_summary = (
        change_summary.strip()
        or "prepare GitHub release assistant and release workflow"
    )

    return "\n".join([
        "Release commit suggestion:",
        "",
        f'git commit -m "Release O.R.I.O.N. {release_version}: {clean_summary}"',
        "",
        "Alternative conventional commit:",
        "",
        f'git commit -m "chore(release): prepare O.R.I.O.N. {release_version}"',
    ])
