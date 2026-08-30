"""Session isolation, provider selection, fallback, and failure tests."""

import asyncio
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from agents import Agent

from core import agent_runtime, capability_gateway


@contextmanager
def agent_gateway(capability: str = "run_mission_step"):
    with patch.object(
        capability_gateway, "_policy_snapshot", return_value=("agent-test", set())
    ), patch.object(
        capability_gateway,
        "_plugin_decision",
        return_value=(True, "allowed", "medium", "agent"),
    ), patch.object(capability_gateway, "_audit"):
        with capability_gateway.authorized(
            capability, capability_gateway.test_context(capability)
        ):
            yield


class RecordingAdapter:
    def __init__(self, failures: int = 0) -> None:
        self.failures = failures
        self.calls = []

    async def run(self, agent, prompt, *, model, session):
        self.calls.append(
            {
                "agent": agent,
                "prompt": prompt,
                "model": model,
                "session_id": session.session_id,
            }
        )
        if len(self.calls) <= self.failures:
            raise RuntimeError(f"Injected provider failure {len(self.calls)}")
        usage = SimpleNamespace(
            input_tokens=7,
            output_tokens=3,
            total_tokens=10,
        )
        return SimpleNamespace(
            final_output=f"response from {model}",
            raw_responses=[SimpleNamespace(usage=usage)],
        )


class BlockingAdapter:
    async def run(self, agent, prompt, *, model, session):
        await asyncio.Event().wait()


class AgentRuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        root = Path(self.temporary_directory.name)
        self.db_patch = patch.object(agent_runtime, "DB_PATH", root / "runtime.sqlite")
        self.session_patch = patch.object(
            agent_runtime, "SESSION_DB_PATH", root / "sessions.sqlite"
        )
        self.db_patch.start()
        self.session_patch.start()
        self.agent = Agent(name="Test O.R.I.O.N.", instructions="Return test output.")

    async def asyncTearDown(self) -> None:
        self.session_patch.stop()
        self.db_patch.stop()
        self.temporary_directory.cleanup()

    async def invoke(self, adapter, **kwargs):
        with patch.dict(
            agent_runtime.PROVIDER_ADAPTERS, {"openai": adapter}, clear=True
        ), agent_gateway():
            return await agent_runtime.run_scoped_agent(
                self.agent,
                "test prompt",
                provider="openai",
                model="selected-model",
                **kwargs,
            )

    async def test_two_missions_receive_different_conversations_and_sessions(self) -> None:
        adapter = RecordingAdapter()
        first = await self.invoke(
            adapter,
            scope_type="mission",
            scope_id="101",
            mission_id=101,
        )
        second = await self.invoke(
            adapter,
            scope_type="mission",
            scope_id="202",
            mission_id=202,
        )

        self.assertNotEqual(first.conversation_id, second.conversation_id)
        self.assertNotEqual(adapter.calls[0]["session_id"], adapter.calls[1]["session_id"])
        self.assertEqual(adapter.calls[0]["model"], "selected-model")
        self.assertEqual(first.model, "selected-model")
        self.assertEqual(first.usage["total_tokens"], 10)

    async def test_conversation_cannot_be_reused_by_another_mission(self) -> None:
        adapter = RecordingAdapter()
        first = await self.invoke(
            adapter,
            scope_type="mission",
            scope_id="101",
            mission_id=101,
        )
        with patch.dict(
            agent_runtime.PROVIDER_ADAPTERS, {"openai": adapter}, clear=True
        ), agent_gateway():
            with self.assertRaises(PermissionError):
                await agent_runtime.run_scoped_agent(
                    self.agent,
                    "other mission prompt",
                    scope_type="mission",
                    scope_id="202",
                    conversation_id=first.conversation_id,
                    provider="openai",
                    model="selected-model",
                    mission_id=202,
                )

    async def test_configured_fallback_is_recorded_and_used(self) -> None:
        adapter = RecordingAdapter(failures=1)
        outcome = await self.invoke(
            adapter,
            scope_type="chat",
            scope_id="chat-a",
            fallback_model="fallback-model",
        )

        self.assertEqual([call["model"] for call in adapter.calls], ["selected-model", "fallback-model"])
        self.assertTrue(outcome.fallback_used)
        self.assertEqual(outcome.model, "fallback-model")
        runs = agent_runtime.list_agent_runs()
        self.assertEqual([run["status"] for run in runs], ["succeeded", "recoverable_failure"])

    async def test_provider_failure_creates_recoverable_run_state(self) -> None:
        adapter = RecordingAdapter(failures=2)
        with patch.dict(
            agent_runtime.PROVIDER_ADAPTERS, {"openai": adapter}, clear=True
        ), agent_gateway():
            with self.assertRaises(agent_runtime.RecoverableAgentRunError) as raised:
                await agent_runtime.run_scoped_agent(
                    self.agent,
                    "failure prompt",
                    scope_type="mission",
                    scope_id="303",
                    provider="openai",
                    model="selected-model",
                    fallback_model="fallback-model",
                    mission_id=303,
                )

        run = agent_runtime.get_agent_run(raised.exception.run_id)
        conversation = agent_runtime.get_conversation(
            raised.exception.conversation_id
        )
        self.assertEqual(run["status"], "recoverable_failure")
        self.assertTrue(run["recoverable"])
        self.assertEqual(conversation["status"], "recoverable_failure")

    async def test_timeout_cancellation_is_persisted_as_recoverable(self) -> None:
        adapter = BlockingAdapter()
        with patch.dict(
            agent_runtime.PROVIDER_ADAPTERS, {"openai": adapter}, clear=True
        ), agent_gateway():
            with self.assertRaises(TimeoutError):
                await asyncio.wait_for(
                    agent_runtime.run_scoped_agent(
                        self.agent,
                        "timeout prompt",
                        scope_type="mission",
                        scope_id="timeout",
                        provider="openai",
                        model="selected-model",
                        mission_id=404,
                    ),
                    timeout=0.01,
                )
        run = agent_runtime.list_agent_runs(limit=1)[0]
        self.assertEqual(run["status"], "cancelled_recoverable")
        self.assertTrue(run["recoverable"])


if __name__ == "__main__":
    unittest.main()
