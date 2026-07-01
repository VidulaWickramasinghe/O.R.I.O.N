"""
Portfolio Demo Tools for O.R.I.O.N.

This module provides safe tool wrappers for Portfolio Demo / Demo Mode features.
It is intentionally defensive so the backend can still compile even if the
portfolio demo core functions are still being upgraded.
"""

from pathlib import Path
from typing import Any, Dict, List


try:
    from agents import function_tool
except Exception:
    def function_tool(func):
        return func


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEMO_OUTPUT_DIR = BACKEND_DIR / "data" / "demo"


def _safe_import_portfolio_demo():
    """
    Import portfolio demo core lazily so this tool file can compile even while
    the core module is being upgraded.
    """
    try:
        from core import portfolio_demo

        return portfolio_demo
    except Exception:
        return None


@function_tool
def get_portfolio_demo_status() -> str:
    """
    Return the current Portfolio Demo / Demo Mode status.
    """
    portfolio_demo = _safe_import_portfolio_demo()

    if portfolio_demo and hasattr(portfolio_demo, "get_demo_status"):
        try:
            return str(portfolio_demo.get_demo_status())
        except Exception as error:
            return f"Portfolio demo status failed: {error}"

    if portfolio_demo and hasattr(portfolio_demo, "load_demo_status"):
        try:
            return str(portfolio_demo.load_demo_status())
        except Exception as error:
            return f"Portfolio demo status failed: {error}"

    return (
        "Portfolio Demo tool is available, but no compatible core status "
        "function was found yet."
    )


@function_tool
def generate_portfolio_demo_pack() -> str:
    """
    Generate a portfolio demo/release pack if the core demo module supports it.
    """
    portfolio_demo = _safe_import_portfolio_demo()

    if portfolio_demo and hasattr(portfolio_demo, "generate_demo_release_pack"):
        try:
            return str(portfolio_demo.generate_demo_release_pack())
        except Exception as error:
            return f"Portfolio demo pack generation failed: {error}"

    if portfolio_demo and hasattr(portfolio_demo, "generate_portfolio_demo_pack"):
        try:
            return str(portfolio_demo.generate_portfolio_demo_pack())
        except Exception as error:
            return f"Portfolio demo pack generation failed: {error}"

    DEMO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    placeholder_file = DEMO_OUTPUT_DIR / "portfolio_demo_placeholder.md"
    placeholder_file.write_text(
        "# O.R.I.O.N. Portfolio Demo Pack\n\n"
        "Portfolio Demo tooling is connected, but the core pack generator "
        "has not been implemented yet.\n",
        encoding="utf-8",
    )

    return f"Placeholder portfolio demo pack created: {placeholder_file}"


@function_tool
def list_portfolio_demo_files() -> str:
    """
    List generated portfolio demo files.
    """
    if not DEMO_OUTPUT_DIR.exists():
        return "No portfolio demo output directory exists yet."

    files: List[str] = [
        str(path.relative_to(BACKEND_DIR))
        for path in DEMO_OUTPUT_DIR.rglob("*")
        if path.is_file()
    ]

    if not files:
        return "No portfolio demo files found."

    return "\n".join(files)


@function_tool
def read_portfolio_demo_file(relative_path: str) -> str:
    """
    Read a generated portfolio demo file from the backend data/demo directory.
    """
    clean_path = relative_path.strip().lstrip("/")

    if not clean_path:
        return "No file path provided."

    target_path = (BACKEND_DIR / clean_path).resolve()
    demo_root = DEMO_OUTPUT_DIR.resolve()

    if not str(target_path).startswith(str(demo_root)):
        return "Access denied. Only files inside backend/data/demo can be read."

    if not target_path.exists() or not target_path.is_file():
        return f"Portfolio demo file not found: {clean_path}"

    try:
        return target_path.read_text(encoding="utf-8")
    except Exception as error:
        return f"Could not read portfolio demo file: {error}"


# Friendly aliases in case future code imports these names.
get_demo_status = get_portfolio_demo_status
generate_demo_pack = generate_portfolio_demo_pack
generate_portfolio_demo_release_pack = generate_portfolio_demo_pack
