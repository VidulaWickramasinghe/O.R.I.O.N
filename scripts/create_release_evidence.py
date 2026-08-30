#!/usr/bin/env python3
"""Create deterministic, hash-backed evidence after every required CI job passes."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def create_evidence(
    *,
    checks: list[str],
    artifact_root: Path,
    output: Path,
    run_url: str,
    commit_sha: str,
) -> dict:
    artifact_files = sorted(path for path in artifact_root.rglob("*") if path.is_file())
    if not artifact_files:
        raise ValueError("No build artifacts were supplied for release evidence.")
    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "run_url": run_url,
        "commit_sha": commit_sha.lower(),
        "checks": [{"name": name, "status": "passed"} for name in sorted(set(checks))],
        "artifacts": [
            {
                "name": path.relative_to(artifact_root).as_posix(),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
            for path in artifact_files
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=output.parent, delete=False
    ) as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(output)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="append", default=[])
    parser.add_argument("--artifact-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--run-url", default=os.getenv("ORION_CI_RUN_URL", ""))
    parser.add_argument("--commit-sha", default=os.getenv("GITHUB_SHA", ""))
    arguments = parser.parse_args()
    create_evidence(
        checks=arguments.check,
        artifact_root=arguments.artifact_root,
        output=arguments.output,
        run_url=arguments.run_url,
        commit_sha=arguments.commit_sha,
    )
    print(f"Release evidence written to {arguments.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
