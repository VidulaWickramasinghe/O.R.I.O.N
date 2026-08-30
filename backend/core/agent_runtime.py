"""Scoped agent conversations, provider selection, fallback, and usage accounting."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Protocol

from agents import Agent, Runner, SQLiteSession

from core.capability_gateway import requires_gateway
from core.database import managed_connection
from core.runtime_paths import runtime_data_dir
from core.user_settings import get_user_settings_map


DATA_DIR = runtime_data_dir()
DB_PATH = DATA_DIR / "orion_agent_runtime.sqlite"
SESSION_DB_PATH = DATA_DIR / "orion_agent_sessions.sqlite"

MODEL_ALIASES = {
    "default": lambda: os.getenv("ORION_DEFAULT_MODEL", "gpt-4.1-mini"),
    "fast": lambda: os.getenv("ORION_FAST_MODEL", "gpt-4.1-mini"),
    "reasoning": lambda: os.getenv("ORION_REASONING_MODEL", "gpt-5"),
}
ALLOWED_PROVIDERS = frozenset({"openai"})


class ProviderUnavailableError(RuntimeError):
    pass


class RecoverableAgentRunError(RuntimeError):
    def __init__(self, message: str, *, conversation_id: str, run_id: int) -> None:
        super().__init__(message)
        self.conversation_id = conversation_id
        self.run_id = run_id


class ProviderAdapter(Protocol):
    async def run(
        self,
        agent: Agent,
        prompt: str,
        *,
        model: str,
        session: SQLiteSession,
    ) -> Any: ...


class OpenAIAgentsAdapter:
    async def run(
        self,
        agent: Agent,
        prompt: str,
        *,
        model: str,
        session: SQLiteSession,
    ) -> Any:
        if not os.getenv("OPENAI_API_KEY", "").strip():
            raise ProviderUnavailableError("OPENAI_API_KEY is not configured.")
        return await Runner.run(agent.clone(model=model), prompt, session=session)


PROVIDER_ADAPTERS: Dict[str, ProviderAdapter] = {"openai": OpenAIAgentsAdapter()}


@dataclass(frozen=True)
class AgentRunOutcome:
    result: Any
    conversation_id: str
    run_id: int
    provider: str
    model: str
    fallback_used: bool
    usage: Dict[str, int]


def get_connection():
    return managed_connection(DB_PATH)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_agent_runtime_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_conversations (
                id TEXT PRIMARY KEY,
                scope_type TEXT NOT NULL,
                scope_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(scope_type, scope_id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                mission_id INTEGER,
                step_id INTEGER,
                mission_run_id INTEGER,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                attempt INTEGER NOT NULL,
                status TEXT NOT NULL,
                recoverable INTEGER NOT NULL DEFAULT 0,
                fallback_used INTEGER NOT NULL DEFAULT 0,
                input_hash TEXT NOT NULL,
                output TEXT DEFAULT '',
                error TEXT DEFAULT '',
                usage_json TEXT NOT NULL DEFAULT '{}',
                started_at TEXT NOT NULL,
                completed_at TEXT DEFAULT '',
                FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id)
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_agent_runs_conversation
            ON agent_runs(conversation_id, id)
            """
        )


def _resolve_model(requested: str = "") -> str:
    choice = str(requested or "").strip()
    if not choice:
        choice = str(get_user_settings_map().get("preferred_model", "default"))
    resolver = MODEL_ALIASES.get(choice)
    return str(resolver() if resolver else choice).strip()


def _resolve_provider(requested: str = "") -> str:
    provider = str(requested or os.getenv("ORION_MODEL_PROVIDER", "openai")).strip().lower()
    if provider not in ALLOWED_PROVIDERS or provider not in PROVIDER_ADAPTERS:
        raise ProviderUnavailableError(f"Model provider is not configured: {provider}.")
    return provider


def _conversation(
    *,
    scope_type: str,
    scope_id: str,
    provider: str,
    model: str,
    conversation_id: str = "",
) -> Dict[str, Any]:
    init_agent_runtime_db()
    clean_scope = str(scope_type).strip()
    clean_scope_id = str(scope_id).strip()
    if clean_scope not in {"chat", "mission"} or not clean_scope_id:
        raise ValueError("Agent conversation scope is invalid.")
    now = _now()
    with get_connection() as connection:
        connection.row_factory = sqlite3.Row
        if conversation_id:
            row = connection.execute(
                "SELECT * FROM agent_conversations WHERE id = ?",
                (str(conversation_id),),
            ).fetchone()
            if not row:
                raise ValueError("Agent conversation was not found.")
            item = dict(row)
            if item["scope_type"] != clean_scope or item["scope_id"] != clean_scope_id:
                raise PermissionError("Agent conversation belongs to a different scope.")
            return item
        row = connection.execute(
            "SELECT * FROM agent_conversations WHERE scope_type = ? AND scope_id = ?",
            (clean_scope, clean_scope_id),
        ).fetchone()
        if row:
            return dict(row)
        identifier = uuid.uuid4().hex
        connection.execute(
            """
            INSERT INTO agent_conversations
            (id, scope_type, scope_id, provider, model, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (identifier, clean_scope, clean_scope_id, provider, model, now, now),
        )
        return {
            "id": identifier,
            "scope_type": clean_scope,
            "scope_id": clean_scope_id,
            "provider": provider,
            "model": model,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }


def _usage(result: Any) -> Dict[str, int]:
    totals = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "requests": 0}
    for response in getattr(result, "raw_responses", []) or []:
        usage = getattr(response, "usage", None)
        if not usage:
            continue
        totals["requests"] += 1
        for key in ("input_tokens", "output_tokens", "total_tokens"):
            totals[key] += int(getattr(usage, key, 0) or 0)
    return totals


def _start_run(
    conversation_id: str,
    *,
    provider: str,
    model: str,
    attempt: int,
    prompt: str,
    mission_id: Optional[int],
    step_id: Optional[int],
    mission_run_id: Optional[int],
    fallback_used: bool,
) -> int:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO agent_runs
            (conversation_id, mission_id, step_id, mission_run_id, provider, model,
             attempt, status, recoverable, fallback_used, input_hash, started_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'running', 0, ?, ?, ?)
            """,
            (
                conversation_id,
                mission_id,
                step_id,
                mission_run_id,
                provider,
                model,
                int(attempt),
                int(fallback_used),
                hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
                _now(),
            ),
        )
        return int(cursor.lastrowid)


def _finish_run(run_id: int, *, status: str, output: str = "", error: str = "", usage: Optional[Dict[str, int]] = None, recoverable: bool = False) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE agent_runs
            SET status = ?, recoverable = ?, output = ?, error = ?, usage_json = ?, completed_at = ?
            WHERE id = ? AND status = 'running'
            """,
            (
                status,
                int(recoverable),
                str(output)[:20_000],
                str(error)[:8_000],
                json.dumps(usage or {}, sort_keys=True),
                _now(),
                int(run_id),
            ),
        )


@requires_gateway
async def run_scoped_agent(
    agent: Agent,
    prompt: str,
    *,
    scope_type: str,
    scope_id: str,
    conversation_id: str = "",
    provider: str = "",
    model: str = "",
    fallback_model: str = "",
    mission_id: Optional[int] = None,
    step_id: Optional[int] = None,
    mission_run_id: Optional[int] = None,
) -> AgentRunOutcome:
    selected_provider = _resolve_provider(provider)
    selected_model = _resolve_model(model)
    configured_fallback = str(
        fallback_model or os.getenv("ORION_FALLBACK_MODEL", "")
    ).strip()
    models = [selected_model]
    if configured_fallback and configured_fallback != selected_model:
        models.append(configured_fallback)
    conversation = _conversation(
        scope_type=scope_type,
        scope_id=scope_id,
        provider=selected_provider,
        model=selected_model,
        conversation_id=conversation_id,
    )
    adapter = PROVIDER_ADAPTERS[selected_provider]
    last_error: Exception | None = None
    last_run_id = 0
    for attempt, attempt_model in enumerate(models, start=1):
        fallback_used = attempt > 1
        last_run_id = _start_run(
            conversation["id"],
            provider=selected_provider,
            model=attempt_model,
            attempt=attempt,
            prompt=prompt,
            mission_id=mission_id,
            step_id=step_id,
            mission_run_id=mission_run_id,
            fallback_used=fallback_used,
        )
        try:
            session = SQLiteSession(
                conversation["id"],
                db_path=SESSION_DB_PATH,
            )
            result = await adapter.run(
                agent,
                prompt,
                model=attempt_model,
                session=session,
            )
            usage = _usage(result)
            output = str(getattr(result, "final_output", "") or "")
            _finish_run(last_run_id, status="succeeded", output=output, usage=usage)
            with get_connection() as connection:
                connection.execute(
                    "UPDATE agent_conversations SET provider = ?, model = ?, status = 'active', updated_at = ? WHERE id = ?",
                    (selected_provider, attempt_model, _now(), conversation["id"]),
                )
            return AgentRunOutcome(
                result=result,
                conversation_id=conversation["id"],
                run_id=last_run_id,
                provider=selected_provider,
                model=attempt_model,
                fallback_used=fallback_used,
                usage=usage,
            )
        except asyncio.CancelledError:
            _finish_run(
                last_run_id,
                status="cancelled_recoverable",
                error="Provider execution was cancelled or timed out.",
                recoverable=True,
            )
            with get_connection() as connection:
                connection.execute(
                    "UPDATE agent_conversations SET status = 'recoverable_failure', updated_at = ? WHERE id = ?",
                    (_now(), conversation["id"]),
                )
            raise
        except Exception as error:
            last_error = error
            _finish_run(
                last_run_id,
                status="recoverable_failure",
                error=f"{type(error).__name__}: {error}",
                recoverable=True,
            )
    with get_connection() as connection:
        connection.execute(
            "UPDATE agent_conversations SET status = 'recoverable_failure', updated_at = ? WHERE id = ?",
            (_now(), conversation["id"]),
        )
    raise RecoverableAgentRunError(
        f"Provider execution failed and can be retried: {type(last_error).__name__}: {last_error}",
        conversation_id=conversation["id"],
        run_id=last_run_id,
    )


def get_agent_run(run_id: int) -> Optional[Dict[str, Any]]:
    init_agent_runtime_db()
    with get_connection() as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute("SELECT * FROM agent_runs WHERE id = ?", (int(run_id),)).fetchone()
    if not row:
        return None
    item = dict(row)
    try:
        item["usage"] = json.loads(item.pop("usage_json"))
    except (json.JSONDecodeError, TypeError):
        item["usage"] = {}
    return item


def list_agent_runs(limit: int = 100) -> list[Dict[str, Any]]:
    init_agent_runtime_db()
    with get_connection() as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT * FROM agent_runs ORDER BY id DESC LIMIT ?",
            (max(1, min(int(limit), 1000)),),
        ).fetchall()
    results = []
    for row in rows:
        item = dict(row)
        try:
            item["usage"] = json.loads(item.pop("usage_json"))
        except (json.JSONDecodeError, TypeError):
            item["usage"] = {}
        results.append(item)
    return results


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    init_agent_runtime_db()
    with get_connection() as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT * FROM agent_conversations WHERE id = ?", (str(conversation_id),)
        ).fetchone()
    return dict(row) if row else None
