"""Local-only public portfolio release asset generation."""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from core.release_verification import (
    generate_release_verification_snapshot,
    render_release_verification_report,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUT = PROJECT_ROOT / "backend" / "data" / "public_release"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _write(name: str, body: str) -> str:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=OUT, delete=False
    ) as handle:
        handle.write(body)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)
    return str(path)


def _docs() -> Dict[str, str]:
    return {
        "public_readme": "# O.R.I.O.N.\n\nThink. Plan. Act. Learn.\n\nLocal-first, approval-gated AI dashboard.\n",
        "demo_script": "# O.R.I.O.N. Demo Script\n\nShow Dashboard Intelligence, Security View, Tool Audit, Release Candidate, Quality Gate, and Public Release.\n",
        "known_limitations": "# Known Limitations\n\nLocal-first prototype; no production auth or automated publishing.\n",
        "architecture_summary": "# Architecture Summary\n\nAurora OS frontend → API service layer → FastAPI → approval-gated tools and local storage.\n",
        "screenshot_checklist": "# Screenshot Checklist\n\n- [ ] Aurora OS dashboard\n- [ ] Security View\n- [ ] Release View\n- [ ] Quality Gate\n- [ ] Public Release\n",
        "github_release_notes": "# O.R.I.O.N. Release Notes\n\nLocal-only public portfolio assets; no automatic publishing.\n",
    }


def generate_public_release_package() -> Dict[str, Any]:
    stamp = _stamp()
    verification = generate_release_verification_snapshot()
    docs = _docs()
    docs["release_verification"] = render_release_verification_report(verification)
    artifacts = {
        key: _write(f"{key.upper()}_{stamp}.md", body)
        for key, body in docs.items()
    }
    summary: Dict[str, Any] = {
        "status": "generated",
        "version": "v6.5",
        "name": "Public Portfolio Release + Demo Package",
        "generated_at": _now(),
        "artifact_count": len(artifacts),
        "artifacts": artifacts,
        "safety": {
            "local_only": True,
            "pushes_to_github": False,
            "publishes_release": False,
            "bypasses_approvals": False,
        },
        "verification_status": verification["status"],
    }
    summary_path = OUT / f"PUBLIC_RELEASE_SUMMARY_{stamp}.json"
    summary["summary_path"] = str(summary_path)
    _write(summary_path.name, json.dumps(summary, indent=2, sort_keys=True))
    return summary


def get_latest_public_release_package() -> Dict[str, Any]:
    summaries = sorted(OUT.glob("PUBLIC_RELEASE_SUMMARY_*.json"), reverse=True)
    for path in summaries:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("summary_path") == str(path):
                return data
        except (OSError, json.JSONDecodeError):
            continue
    return {
        "status": "not_generated",
        "version": "v6.5",
        "name": "Public Portfolio Release + Demo Package",
        "generated_at": _now(),
        "artifact_count": 0,
        "artifacts": {},
        "summary_path": "",
        "safety": {
            "local_only": True,
            "pushes_to_github": False,
            "publishes_release": False,
            "bypasses_approvals": False,
        },
    }


def render_public_release_report(package: Dict[str, Any] | None = None) -> str:
    package = package or get_latest_public_release_package()
    artifact_lines = "\n".join(
        f"- {name}: {path}" for name, path in package["artifacts"].items()
    ) or "No public release artifacts have been generated."
    return f"""# O.R.I.O.N. v6.5 Public Release Report

Generated: {package['generated_at']}
Status: {package['status']}
Artifacts: {package['artifact_count']}
Summary: {package['summary_path'] or 'Not generated'}

## Artifacts

{artifact_lines}

## Safety

Local-only; no push, publish, deletion, or approval bypass.
"""
