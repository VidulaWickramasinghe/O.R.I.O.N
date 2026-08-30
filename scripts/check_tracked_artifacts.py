#!/usr/bin/env python3
"""Fail CI when Git tracks runtime/private artifacts or obvious secrets."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from typing import Iterable


ARCHIVE_SUFFIXES = (".zip", ".tar", ".tar.gz", ".tgz", ".7z", ".rar")
DATABASE_SUFFIXES = (".sqlite", ".sqlite3", ".db")
PRIVATE_RUNTIME_NAMES = {
    "activity_timeline.json",
    "context_history.json",
    "portfolio_demo_state.json",
    "projects.json",
    "user_preference_name.txt",
    "voice_state.json",
}
TEXT_SUFFIXES = {
    ".cfg", ".conf", ".env", ".ini", ".json", ".md", ".mjs", ".py",
    ".rs", ".sh", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml",
}

SECRET_PATTERNS = {
    "private key": re.compile("-----BEGIN " + r"(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "OpenAI-style key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "personal macOS path": re.compile(r"/Users/" + r"[^/\s]+/"),
    "personal Linux path": re.compile(r"/home/" + r"[^/\s]+/"),
    "personal Windows path": re.compile(r"[A-Za-z]:\\" + r"Users\\[^\\\s]+\\"),
}


def tracked_files(repository: Path) -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        cwd=repository,
        check=True,
        capture_output=True,
    )
    return [item.decode("utf-8") for item in result.stdout.split(b"\0") if item]


def forbidden_path_reason(relative_path: str) -> str | None:
    portable = PurePosixPath(relative_path)
    lowered = relative_path.casefold()
    if portable.parts[:2] == ("backend", "data"):
        return "runtime data must not be tracked"
    if lowered.endswith(DATABASE_SUFFIXES):
        return "database files must not be tracked"
    if lowered.endswith(ARCHIVE_SUFFIXES):
        return "build/release archives must not be tracked"
    if portable.name.casefold() in PRIVATE_RUNTIME_NAMES:
        return "private runtime state must not be tracked"
    if portable.name.casefold() in {".env", ".netrc", ".npmrc", ".pypirc"}:
        return "credential-bearing configuration must not be tracked"
    return None


def scan_repository(repository: Path, files: Iterable[str] | None = None) -> list[str]:
    violations: list[str] = []
    for relative_path in files if files is not None else tracked_files(repository):
        path_reason = forbidden_path_reason(relative_path)
        if path_reason:
            violations.append(f"{relative_path}: {path_reason}")
            continue

        path = repository / relative_path
        if path.suffix.casefold() not in TEXT_SUFFIXES or not path.is_file():
            continue
        if path.stat().st_size > 2_000_000:
            violations.append(f"{relative_path}: tracked text file exceeds 2 MB")
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            violations.append(f"{relative_path}: expected text file is not UTF-8")
            continue
        for line_number, line in enumerate(content.splitlines(), start=1):
            if "scanner: allow-secret" in line:
                continue
            for label, pattern in SECRET_PATTERNS.items():
                if pattern.search(line):
                    violations.append(
                        f"{relative_path}:{line_number}: detected {label}"
                    )
    return violations


def main() -> int:
    repository = Path(__file__).resolve().parents[1]
    violations = scan_repository(repository)
    if violations:
        print("Tracked artifact/security scan failed:", file=sys.stderr)
        for violation in violations:
            print(f"- {violation}", file=sys.stderr)
        return 1
    print("Tracked artifact/security scan passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
