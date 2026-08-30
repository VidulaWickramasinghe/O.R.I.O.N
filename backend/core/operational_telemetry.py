"""Truthful operational telemetry derived only from persisted runtime events."""

from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from core import agent_runtime, mission_planner, tool_audit


RANGE_CONFIG = {
    "24h": (timedelta(hours=24), 12),
    "7d": (timedelta(days=7), 7),
    "30d": (timedelta(days=30), 10),
}


def _parse_timestamp(value: Any) -> Optional[datetime]:
    clean = str(value or "").strip()
    if not clean:
        return None
    try:
        parsed = datetime.fromisoformat(clean.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        # Legacy stores wrote local wall-clock ISO strings without an offset.
        parsed = parsed.replace(tzinfo=datetime.now().astimezone().tzinfo)
    return parsed.astimezone(timezone.utc)


def _read_rows(path: Path, table: str, columns: str) -> List[Dict[str, Any]]:
    if not Path(path).is_file():
        return []
    try:
        connection = sqlite3.connect(f"file:{Path(path)}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        exists = connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table,)
        ).fetchone()
        if not exists:
            return []
        return [dict(row) for row in connection.execute(f"SELECT {columns} FROM {table}")]
    except sqlite3.Error:
        return []
    finally:
        if "connection" in locals():
            connection.close()


def _percent(numerator: int, denominator: int) -> Optional[float]:
    if not denominator:
        return None
    return round((numerator / denominator) * 100, 1)


def _percentile(values: Iterable[float], percentile: float) -> Optional[int]:
    ordered = sorted(values)
    if not ordered:
        return None
    index = min(len(ordered) - 1, max(0, int(round((len(ordered) - 1) * percentile))))
    return int(round(ordered[index]))


def get_operational_telemetry(
    range_key: str = "7d", *, now: Optional[datetime] = None
) -> Dict[str, Any]:
    if range_key not in RANGE_CONFIG:
        raise ValueError("Analytics range must be one of: 24h, 7d, 30d.")
    current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    duration, bucket_count = RANGE_CONFIG[range_key]
    start = current - duration

    tool_rows = _read_rows(
        tool_audit.DB_PATH,
        "tool_audit_events",
        "id, tool_name, actor, decision, side_effect, created_at",
    )
    agent_rows = _read_rows(
        agent_runtime.DB_PATH,
        "agent_runs",
        "id, provider, model, status, usage_json, started_at, completed_at",
    )
    transition_rows = _read_rows(
        mission_planner.DB_PATH,
        "mission_transitions",
        "id, mission_id, entity_type, to_state, created_at",
    )

    executions: List[Dict[str, Any]] = []
    for row in tool_rows:
        timestamp = _parse_timestamp(row.get("created_at"))
        if timestamp and start <= timestamp <= current and bool(row.get("side_effect")):
            executions.append(
                {
                    "timestamp": timestamp,
                    "success": row.get("decision") == "allowed",
                    "agent": str(row.get("actor") or "unknown"),
                    "latency_ms": None,
                }
            )

    total_tokens = 0
    for row in agent_rows:
        timestamp = _parse_timestamp(row.get("started_at"))
        if not timestamp or not (start <= timestamp <= current):
            continue
        completed = _parse_timestamp(row.get("completed_at"))
        latency = (
            max(0, (completed - timestamp).total_seconds() * 1000)
            if completed is not None
            else None
        )
        try:
            usage = json.loads(str(row.get("usage_json") or "{}"))
        except (json.JSONDecodeError, TypeError):
            usage = {}
        total_tokens += sum(
            int(usage.get(key) or 0)
            for key in ("input_tokens", "output_tokens")
        )
        executions.append(
            {
                "timestamp": timestamp,
                "success": row.get("status") in {"completed", "succeeded"},
                "agent": f"{row.get('provider') or 'unknown'}:{row.get('model') or 'unknown'}",
                "latency_ms": latency,
            }
        )

    bucket_seconds = duration.total_seconds() / bucket_count
    buckets = [
        {
            "label": (start + timedelta(seconds=bucket_seconds * index)).isoformat(),
            "executions": 0,
            "successes": 0,
            "latencies": [],
        }
        for index in range(bucket_count)
    ]
    for event in executions:
        index = min(
            bucket_count - 1,
            max(0, int((event["timestamp"] - start).total_seconds() / bucket_seconds)),
        )
        buckets[index]["executions"] += 1
        buckets[index]["successes"] += int(event["success"])
        if event["latency_ms"] is not None:
            buckets[index]["latencies"].append(event["latency_ms"])

    series = [
        {
            "label": bucket["label"],
            "executions": bucket["executions"],
            "latency_ms": (
                int(round(sum(bucket["latencies"]) / len(bucket["latencies"])))
                if bucket["latencies"]
                else None
            ),
            "success_rate": _percent(bucket["successes"], bucket["executions"]),
        }
        for bucket in buckets
    ] if executions else []

    agent_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"tasks": 0, "successes": 0})
    for event in executions:
        item = agent_counts[event["agent"]]
        item["tasks"] += 1
        item["successes"] += int(event["success"])
    agents = [
        {
            "name": name,
            "tasks": counts["tasks"],
            "success_rate": _percent(counts["successes"], counts["tasks"]),
            "utilisation": _percent(counts["tasks"], len(executions)),
        }
        for name, counts in sorted(
            agent_counts.items(), key=lambda item: item[1]["tasks"], reverse=True
        )
    ]

    latest_mission_state: Dict[int, tuple[int, str]] = {}
    for row in transition_rows:
        timestamp = _parse_timestamp(row.get("created_at"))
        if row.get("entity_type") != "mission" or not timestamp or not (start <= timestamp <= current):
            continue
        mission_id = int(row["mission_id"])
        transition_id = int(row["id"])
        if transition_id > latest_mission_state.get(mission_id, (-1, ""))[0]:
            latest_mission_state[mission_id] = (transition_id, str(row.get("to_state") or "unknown"))
    outcome_counts: Dict[str, int] = defaultdict(int)
    for _, state in latest_mission_state.values():
        outcome_counts[state] += 1
    outcomes = [
        {"label": state, "count": count}
        for state, count in sorted(outcome_counts.items())
    ]

    heatmap = [[0 for _ in range(12)] for _ in range(7)]
    for event in executions:
        local = event["timestamp"]
        heatmap[local.weekday()][min(11, local.hour // 2)] += 1

    latencies = [event["latency_ms"] for event in executions if event["latency_ms"] is not None]
    successes = sum(int(event["success"]) for event in executions)
    return {
        "source": "live_events",
        "generated_at": current.isoformat(),
        "range": range_key,
        "window_start": start.isoformat(),
        "window_end": current.isoformat(),
        "has_data": bool(executions or latest_mission_state),
        "summary": {
            "total_executions": len(executions),
            "success_rate": _percent(successes, len(executions)),
            "average_latency_ms": (
                int(round(sum(latencies) / len(latencies))) if latencies else None
            ),
            "p95_latency_ms": _percentile(latencies, 0.95),
            "token_usage": total_tokens,
        },
        "series": series,
        "agents": agents,
        "outcomes": outcomes,
        "heatmap": heatmap,
    }
