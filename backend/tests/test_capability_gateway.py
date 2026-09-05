"""Regression coverage for the mandatory O.R.I.O.N. Capability Gateway."""

from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import ast
import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from core import capability_gateway, plugin_registry, tool_audit
from core.capability_gateway import (
    API_CAPABILITY_MAP,
    INTERNAL_CAPABILITY_MAP,
    CapabilityContext,
    CapabilityDeniedError,
    api_capability_guard,
    execute_capability,
    execution_identity,
)
from core.tool_logger import instrument_tool


BACKEND_ROOT = Path(__file__).resolve().parents[1]
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _decorator_name(decorator: ast.expr) -> str:
    target = decorator.func if isinstance(decorator, ast.Call) else decorator
    if isinstance(target, ast.Name):
        return target.id
    if isinstance(target, ast.Attribute):
        return target.attr
    return ""


def _fake_request(endpoint_name: str, method: str = "POST"):
    def endpoint():
        return None

    endpoint.__name__ = endpoint_name
    return SimpleNamespace(
        scope={"endpoint": endpoint},
        method=method,
        url=SimpleNamespace(path=f"/test/{endpoint_name}"),
        path_params={},
        headers={},
    )


async def _enter_api_guard(request) -> None:
    dependency = api_capability_guard(request)
    await dependency.__anext__()
    await dependency.aclose()


class CapabilityManifestCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import api_main

        cls.api_main = api_main

    def test_every_registered_agent_tool_has_a_manifest(self) -> None:
        registered = {tool.name for tool in self.api_main.orion.tools}
        self.assertGreater(len(registered), 100)
        missing = sorted(
            name
            for name in registered
            if capability_gateway.get_capability_manifest(name) is None
        )
        self.assertEqual(missing, [])

    def test_every_function_tool_is_instrumented_and_mapped(self) -> None:
        function_tools = []
        instrumented = set()
        for path in (BACKEND_ROOT / "tools").rglob("*.py"):
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                    if node.func.id == "instrument_tool" and node.args:
                        value = node.args[0]
                        if isinstance(value, ast.Constant) and isinstance(value.value, str):
                            instrumented.add(value.value)
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                decorators = {_decorator_name(item) for item in node.decorator_list}
                if "function_tool" in decorators:
                    function_tools.append(f"{path.name}:{node.lineno}:{node.name}")
                    self.assertIn(
                        "instrument_tool",
                        decorators,
                        f"Agent tool bypasses shared instrumentation: {function_tools[-1]}",
                    )

        self.assertGreater(len(function_tools), 100)
        unmapped = sorted(
            name
            for name in instrumented
            if capability_gateway.get_capability_manifest(name) is None
        )
        self.assertEqual(unmapped, [])

    def test_every_mutating_api_route_is_explicitly_mapped(self) -> None:
        routes = [
            route
            for route in self.api_main.app.routes
            if set(getattr(route, "methods", set())) & MUTATING_METHODS
        ]
        self.assertGreater(len(routes), 50)
        missing = sorted(
            f"{','.join(sorted(route.methods))} {route.path} ({route.endpoint.__name__})"
            for route in routes
            if route.endpoint.__name__ not in API_CAPABILITY_MAP
        )
        self.assertEqual(missing, [])
        self.assertEqual(
            sorted(
                capability
                for capability in API_CAPABILITY_MAP.values()
                if capability_gateway.get_capability_manifest(capability) is None
            ),
            [],
        )

    def test_routes_calling_guarded_mutators_are_mapped_even_when_get(self) -> None:
        guarded_names = {
            primitive.rsplit(".", 1)[-1] for primitive in INTERNAL_CAPABILITY_MAP
        }
        tree = ast.parse((BACKEND_ROOT / "api_main.py").read_text(encoding="utf-8"))
        missing = []
        for node in tree.body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            if not any(_decorator_name(item) in {"get", "post", "put", "patch", "delete"}
                       for item in node.decorator_list):
                continue
            called = {
                call.func.id
                for call in ast.walk(node)
                if isinstance(call, ast.Call) and isinstance(call.func, ast.Name)
            }
            if called & guarded_names and node.name not in API_CAPABILITY_MAP:
                missing.append(f"{node.name}: {sorted(called & guarded_names)}")
        self.assertEqual(missing, [])

    def test_every_internal_guard_has_an_explicit_valid_parent_binding(self) -> None:
        guarded = set()
        for path in BACKEND_ROOT.rglob("*.py"):
            if "tests" in path.parts:
                continue
            tree = ast.parse(path.read_text(encoding="utf-8"))
            module = path.relative_to(BACKEND_ROOT).with_suffix("").as_posix().replace("/", ".")
            for node in tree.body:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and any(
                    _decorator_name(item) == "requires_gateway"
                    for item in node.decorator_list
                ):
                    guarded.add(f"{module}.{node.name}")

        self.assertEqual(guarded, set(INTERNAL_CAPABILITY_MAP))
        invalid = sorted(
            capability
            for parents in INTERNAL_CAPABILITY_MAP.values()
            for capability in parents
            if capability_gateway.get_capability_manifest(capability) is None
        )
        self.assertEqual(invalid, [])


class CapabilityDenialTests(unittest.TestCase):
    def test_registry_disabled_plugin_is_denied_without_legacy_exemption(self) -> None:
        operation = Mock(return_value="executed")
        with tempfile.TemporaryDirectory() as directory, patch.object(
            plugin_registry, "DB_PATH", Path(directory) / "plugins.sqlite"
        ), patch.object(
            tool_audit, "DB_PATH", Path(directory) / "audit.sqlite"
        ), patch.object(
            capability_gateway, "_policy_snapshot", return_value=("balanced-test", set())
        ):
            plugin_registry.init_plugin_registry_db()
            with plugin_registry.get_connection() as connection:
                connection.execute(
                    "UPDATE plugins SET enabled = 'false' WHERE key = ?",
                    ("memory_system",),
                )
                connection.commit()

            with self.assertRaises(CapabilityDeniedError) as denied:
                execute_capability(
                    "remember_information",
                    capability_gateway.test_context("remember_information"),
                    operation,
                )

        self.assertIn("disabled in the registry", denied.exception.reason)
        operation.assert_not_called()

    def test_policy_disabled_plugin_is_denied_even_when_registry_enabled(self) -> None:
        operation = Mock(return_value="executed")
        with tempfile.TemporaryDirectory() as directory, patch.object(
            plugin_registry, "DB_PATH", Path(directory) / "plugins.sqlite"
        ), patch.object(
            tool_audit, "DB_PATH", Path(directory) / "audit.sqlite"
        ), patch.object(
            capability_gateway,
            "_policy_snapshot",
            return_value=("strict-test", {"memory_system"}),
        ):
            plugin_registry.init_plugin_registry_db()
            self.assertTrue(plugin_registry.get_plugin("memory_system")["enabled"])
            with self.assertRaises(CapabilityDeniedError) as denied:
                execute_capability(
                    "remember_information",
                    capability_gateway.test_context("remember_information"),
                    operation,
                )

        self.assertIn("disabled by the active security policy", denied.exception.reason)
        operation.assert_not_called()

    def test_every_manifest_fails_closed_when_its_plugin_is_disabled(self) -> None:
        for capability in capability_gateway.list_capability_manifests():
            operation = Mock(return_value="executed")
            with self.subTest(capability=capability), patch.object(
                capability_gateway, "_policy_snapshot", return_value=("strict-test", set())
            ), patch.object(
                capability_gateway,
                "_plugin_decision",
                return_value=(False, "Plugin disabled for test.", "high", "test"),
            ), patch.object(capability_gateway, "_audit"):
                with self.assertRaises(CapabilityDeniedError):
                    execute_capability(
                        capability,
                        capability_gateway.test_context(capability, approval_id=1),
                        operation,
                    )
                operation.assert_not_called()

    def test_every_mapped_api_route_is_stopped_before_its_handler(self) -> None:
        side_effecting_gets = {
            "notification_reminders",
            "notification_startup_briefing",
            "dashboard_intelligence",
            "system_doctor",
        }
        for endpoint_name in API_CAPABILITY_MAP:
            method = "GET" if endpoint_name in side_effecting_gets else "POST"
            with self.subTest(endpoint=endpoint_name), patch.object(
                capability_gateway, "_policy_snapshot", return_value=("strict-test", set())
            ), patch.object(
                capability_gateway,
                "_plugin_decision",
                return_value=(False, "Plugin disabled for test.", "high", "test"),
            ), patch.object(capability_gateway, "_audit"):
                with self.assertRaises(HTTPException) as denied:
                    asyncio.run(_enter_api_guard(_fake_request(endpoint_name, method)))
                self.assertEqual(denied.exception.status_code, 403)

    def test_unmapped_mutating_api_route_fails_closed(self) -> None:
        with self.assertRaises(HTTPException) as denied:
            asyncio.run(_enter_api_guard(_fake_request("new_unmapped_route")))
        self.assertEqual(denied.exception.status_code, 403)
        self.assertIn("unmapped route", denied.exception.detail)

    def test_real_direct_api_route_cannot_reach_disabled_plugin(self) -> None:
        import api_main

        with patch.object(
            capability_gateway, "_policy_snapshot", return_value=("strict-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(False, "Workspace plugin disabled.", "high", "workspace"),
        ), patch.object(capability_gateway, "_audit"), patch.object(
            api_main, "register_workspace_record"
        ) as operation, patch.object(
            api_main.LOCAL_API_AUTHENTICATOR,
            "authenticate",
            return_value="local-capability-test",
        ):
            with TestClient(api_main.app) as client:
                response = client.post(
                    "/api/workspaces/register",
                    json={"name": "blocked", "path": "/tmp/blocked", "description": ""},
                )

        self.assertEqual(response.status_code, 403)
        operation.assert_not_called()

    def test_real_agent_tool_cannot_reach_disabled_plugin(self) -> None:
        import api_main
        from core import tool_logger
        from tools import memory_tools

        tool = next(item for item in api_main.orion.tools if item.name == "remember_information")

        async def invoke():
            return await tool.on_invoke_tool(
                SimpleNamespace(tool_name=tool.name, run_config=None),
                json.dumps(
                    {
                        "category": "test",
                        "title": "blocked",
                        "content": "must not persist",
                        "importance": 3,
                    }
                ),
            )

        with patch.object(
            capability_gateway, "_policy_snapshot", return_value=("strict-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(False, "Memory plugin disabled.", "high", "memory"),
        ), patch.object(capability_gateway, "_audit"), patch.object(
            tool_logger, "log_activity"
        ), patch.object(memory_tools, "save_memory_item") as operation:
            result = asyncio.run(invoke())

        self.assertIn("Tool blocked by Capability Gateway", result)
        operation.assert_not_called()

    def test_direct_internal_call_and_cross_capability_substitution_are_blocked(self) -> None:
        with self.assertRaises(CapabilityDeniedError):
            plugin_registry.set_plugin_enabled("memory_system", False)

        with patch.object(
            capability_gateway, "_policy_snapshot", return_value=("balanced-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(True, "allowed", "low", "test"),
        ), patch.object(capability_gateway, "_audit"):
            with capability_gateway.authorized(
                "create_note", capability_gateway.test_context("create_note")
            ):
                with self.assertRaises(CapabilityDeniedError) as denied:
                    plugin_registry.set_plugin_enabled("memory_system", False)
        self.assertIn("not permitted", denied.exception.reason)


class CapabilityContextAndAuditTests(unittest.TestCase):
    def test_mission_tool_decision_records_actor_policy_mission_step_and_scope(self) -> None:
        from core import tool_logger

        operation = Mock(return_value="done")
        wrapped = instrument_tool("update_mission_step_status")(operation)
        identity = CapabilityContext(
            actor="mission_agent",
            source="mission_runner",
            mission_id=41,
            step_id=73,
            run_id=99,
        )
        with tempfile.TemporaryDirectory() as directory, patch.object(
            tool_audit, "DB_PATH", Path(directory) / "audit.sqlite"
        ), patch.object(
            capability_gateway, "_policy_snapshot", return_value=("balanced-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(True, "allowed", "medium", "mission"),
        ), patch(
            "core.mission_manager.assert_mission_execution_allowed"
        ), patch.object(tool_logger, "log_activity"):
            with execution_identity(identity):
                self.assertEqual(wrapped(), "done")
            event = tool_audit.list_tool_audit_events(limit=1)[0]

        operation.assert_called_once_with()
        self.assertEqual(event["actor"], "mission_agent")
        self.assertEqual(event["policy_profile"], "balanced-test")
        self.assertEqual(event["mission_id"], 41)
        self.assertEqual(event["step_id"], 73)
        self.assertEqual(event["run_id"], 99)
        self.assertEqual(event["scope"], "plugin:mission_planner")
        self.assertTrue(event["side_effect"])

    def test_unmapped_capability_is_blocked_and_audited(self) -> None:
        operation = Mock()
        context = CapabilityContext(actor="internal", source="regression_test")
        with tempfile.TemporaryDirectory() as directory, patch.object(
            tool_audit, "DB_PATH", Path(directory) / "audit.sqlite"
        ):
            with self.assertRaises(CapabilityDeniedError):
                execute_capability("unmapped_mutator", context, operation)
            event = tool_audit.list_tool_audit_events(limit=1)[0]

        operation.assert_not_called()
        self.assertEqual(event["decision"], "blocked")
        self.assertEqual(event["actor"], "internal")
        self.assertEqual(event["policy_profile"], "unavailable")
        self.assertIsNone(event["mission_id"])
        self.assertIsNone(event["step_id"])
        self.assertIsNone(event["run_id"])

    def test_approval_capability_rejects_missing_approval_and_allows_valid_one(self) -> None:
        operation = Mock(return_value="executed")
        with tempfile.TemporaryDirectory() as directory, patch.object(
            tool_audit, "DB_PATH", Path(directory) / "audit.sqlite"
        ), patch.object(
            capability_gateway, "_policy_snapshot", return_value=("balanced-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(True, "allowed", "high", "approval"),
        ):
            with self.assertRaises(CapabilityDeniedError):
                execute_capability(
                    "execute_approved_action",
                    capability_gateway.test_context("execute_approved_action"),
                    operation,
                )
            operation.assert_not_called()

            with patch.object(
                capability_gateway,
                "_approval_is_valid",
                return_value=(True, "Pending approval validated."),
            ):
                result = execute_capability(
                    "execute_approved_action",
                    capability_gateway.test_context(
                        "execute_approved_action", approval_id=99
                    ),
                    operation,
                )
            events = tool_audit.list_tool_audit_events(limit=2)

        self.assertEqual(result, "executed")
        self.assertEqual([event["decision"] for event in events], ["allowed", "blocked"])
        self.assertEqual(events[0]["approval_id"], 99)


if __name__ == "__main__":
    unittest.main()
