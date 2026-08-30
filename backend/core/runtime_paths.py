"""Runtime storage paths shared by development and packaged O.R.I.O.N."""

from __future__ import annotations

import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]


def runtime_data_dir() -> Path:
    configured = str(os.getenv("ORION_DATA_DIR", "")).strip()
    target = Path(configured).expanduser() if configured else BACKEND_DIR / "data"
    resolved = target.resolve(strict=False)
    resolved.mkdir(parents=True, exist_ok=True)
    return resolved


def runtime_data_path(*parts: str) -> Path:
    target = runtime_data_dir().joinpath(*parts)
    target.parent.mkdir(parents=True, exist_ok=True)
    return target
