"""Validation for CI evidence required by release-candidate generation."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict

from core.runtime_paths import runtime_data_dir


REQUIRED_CI_CHECKS = frozenset(
    {
        "api-security",
        "artifact-scan",
        "backend",
        "dependency-audit",
        "frontend-build",
        "frontend-e2e",
        "frontend-lint",
        "frontend-typecheck",
        "migration",
        "tauri-build",
        "tauri-test",
    }
)
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
COMMIT_PATTERN = re.compile(r"^[0-9a-f]{7,64}$")


def release_evidence_path() -> Path:
    configured = os.getenv("ORION_CI_EVIDENCE_PATH", "").strip()
    return Path(configured).expanduser() if configured else runtime_data_dir() / "release_evidence.json"


def validate_release_evidence(path: Path | None = None) -> Dict[str, Any]:
    evidence_path = path or release_evidence_path()
    if not evidence_path.is_file():
        raise ValueError(f"Required CI release evidence is missing: {evidence_path}")
    try:
        payload = json.loads(evidence_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as error:
        raise ValueError("CI release evidence is unreadable or invalid JSON.") from error
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        raise ValueError("CI release evidence schema_version must be 1.")
    run_url = str(payload.get("run_url") or "")
    if not run_url.startswith("https://github.com/") or "/actions/runs/" not in run_url:
        raise ValueError("CI release evidence must link to an exact GitHub Actions run.")
    commit_sha = str(payload.get("commit_sha") or "").lower()
    if not COMMIT_PATTERN.fullmatch(commit_sha):
        raise ValueError("CI release evidence commit SHA is invalid.")
    checks = payload.get("checks")
    if not isinstance(checks, list):
        raise ValueError("CI release evidence checks must be a list.")
    statuses = {
        str(item.get("name")): str(item.get("status"))
        for item in checks
        if isinstance(item, dict)
    }
    missing = sorted(REQUIRED_CI_CHECKS - statuses.keys())
    failed = sorted(
        name for name in REQUIRED_CI_CHECKS if statuses.get(name) != "passed"
    )
    if missing or failed:
        raise ValueError(
            "CI release evidence is incomplete or failed. "
            f"Missing: {missing or 'none'}; not passed: {failed or 'none'}."
        )
    artifacts = payload.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        raise ValueError("CI release evidence must contain hashed build artifacts.")
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            raise ValueError("CI artifact evidence must be an object.")
        name = str(artifact.get("name") or "").strip()
        digest = str(artifact.get("sha256") or "").lower()
        if not name or not SHA256_PATTERN.fullmatch(digest):
            raise ValueError("Every CI artifact requires a name and SHA-256 digest.")
    return {**payload, "path": str(evidence_path)}


def get_release_evidence_status(path: Path | None = None) -> Dict[str, Any]:
    try:
        evidence = validate_release_evidence(path)
        return {
            "status": "passed",
            "ok": True,
            "run_url": evidence["run_url"],
            "commit_sha": evidence["commit_sha"],
            "artifact_count": len(evidence["artifacts"]),
            "path": evidence["path"],
        }
    except ValueError as error:
        return {
            "status": "missing_or_invalid",
            "ok": False,
            "error": str(error),
            "path": str(path or release_evidence_path()),
        }
