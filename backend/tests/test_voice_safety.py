"""Voice capture must remain explicit, bounded, gateway-controlled, and review-only."""

from backend.tests import TEST_DATA_DIR as _TEST_DATA_DIR

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import api_main
from core import capability_gateway, tool_audit
from core.capability_gateway import CapabilityDeniedError
from core.voice_transcription import transcribe_audio_bytes, validate_voice_upload


class VoiceUploadValidationTests(unittest.TestCase):
    def test_upload_validation_rejects_empty_large_and_unsupported_audio(self) -> None:
        with self.assertRaises(ValueError):
            validate_voice_upload(b"", "voice.webm", "audio/webm")
        with self.assertRaises(OverflowError):
            validate_voice_upload(b"x" * (10 * 1024 * 1024 + 1), "voice.webm", "audio/webm")
        with self.assertRaises(TypeError):
            validate_voice_upload(b"voice", "voice.txt", "text/plain")

    def test_direct_transcription_cannot_bypass_capability_gateway(self) -> None:
        with self.assertRaises(CapabilityDeniedError):
            transcribe_audio_bytes(b"voice", "voice.webm", "audio/webm")


class VoiceApiSafetyTests(unittest.TestCase):
    def test_unauthenticated_transcription_is_rejected(self) -> None:
        with TestClient(api_main.app) as client:
            response = client.post(
                "/api/voice/transcribe",
                files={"audio": ("voice.webm", b"voice", "audio/webm")},
            )
        self.assertEqual(response.status_code, 401)

    def test_transcription_returns_review_only_result(self) -> None:
        with tempfile.TemporaryDirectory() as directory, patch.object(
            tool_audit, "DB_PATH", Path(directory) / "audit.sqlite"
        ), patch.object(
            capability_gateway, "_policy_snapshot", return_value=("voice-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(True, "allowed", "medium", "voice"),
        ), patch.object(
            api_main.LOCAL_API_AUTHENTICATOR,
            "authenticate",
            return_value="voice-local-session",
        ), patch.object(
            api_main,
            "transcribe_audio_bytes",
            return_value="Review before sending",
        ) as transcribe:
            with TestClient(api_main.app) as client:
                response = client.post(
                    "/api/voice/transcribe",
                    headers={"Authorization": "Bearer test-token"},
                    files={"audio": ("voice.webm", b"voice", "audio/webm")},
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "review_required",
                "transcript": "Review before sending",
                "auto_submitted": False,
            },
        )
        transcribe.assert_called_once()

    def test_unsupported_upload_never_reaches_transcription(self) -> None:
        with patch.object(
            capability_gateway, "_policy_snapshot", return_value=("voice-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(True, "allowed", "medium", "voice"),
        ), patch.object(
            api_main.LOCAL_API_AUTHENTICATOR,
            "authenticate",
            return_value="voice-local-session",
        ), patch.object(api_main, "transcribe_audio_bytes") as transcribe:
            with TestClient(api_main.app) as client:
                response = client.post(
                    "/api/voice/transcribe",
                    headers={"Authorization": "Bearer test-token"},
                    files={"audio": ("voice.txt", b"not audio", "text/plain")},
                )

        self.assertEqual(response.status_code, 415)
        transcribe.assert_not_called()

    def test_disabled_voice_plugin_blocks_route_before_transcription(self) -> None:
        with patch.object(
            capability_gateway, "_policy_snapshot", return_value=("strict-test", set())
        ), patch.object(
            capability_gateway,
            "_plugin_decision",
            return_value=(False, "Voice plugin disabled.", "medium", "voice"),
        ), patch.object(capability_gateway, "_audit"), patch.object(
            api_main.LOCAL_API_AUTHENTICATOR,
            "authenticate",
            return_value="voice-local-session",
        ), patch.object(api_main, "transcribe_audio_bytes") as transcribe:
            with TestClient(api_main.app) as client:
                response = client.post(
                    "/api/voice/transcribe",
                    headers={"Authorization": "Bearer test-token"},
                    files={"audio": ("voice.webm", b"voice", "audio/webm")},
                )

        self.assertEqual(response.status_code, 403)
        transcribe.assert_not_called()


if __name__ == "__main__":
    unittest.main()
