"""Bounded, approval-loop-neutral voice transcription for Aurora OS."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from openai import OpenAI

from core.capability_gateway import requires_gateway
from core.voice_state import update_voice_state


MAX_VOICE_BYTES = 10 * 1024 * 1024
ALLOWED_VOICE_CONTENT_TYPES = frozenset(
    {
        "audio/mp4",
        "audio/mpeg",
        "audio/ogg",
        "audio/wav",
        "audio/webm",
        "video/webm",
    }
)


class VoiceTranscriptionError(RuntimeError):
    """A sanitized, recoverable transcription failure."""


def validate_voice_upload(content: bytes, filename: str, content_type: str) -> str:
    if not content:
        raise ValueError("Voice capture was empty.")
    if len(content) > MAX_VOICE_BYTES:
        raise OverflowError("Voice capture exceeds the 10 MiB limit.")
    clean_type = str(content_type or "").split(";", 1)[0].strip().lower()
    if clean_type not in ALLOWED_VOICE_CONTENT_TYPES:
        raise TypeError("Voice capture type is not supported.")
    clean_name = Path(str(filename or "voice-capture.webm")).name
    return clean_name[:160] or "voice-capture.webm"


@requires_gateway
def transcribe_audio_bytes(content: bytes, filename: str, content_type: str) -> str:
    """Transcribe one explicit capture without persisting audio or executing its text."""

    clean_name = validate_voice_upload(content, filename, content_type)
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        update_voice_state(
            mode="provider_unavailable",
            listening=False,
            last_event="Voice transcription stopped because the configured provider is unavailable.",
        )
        raise VoiceTranscriptionError(
            "Voice transcription provider unavailable: OPENAI_API_KEY is not configured."
        )

    update_voice_state(
        mode="transcribing",
        listening=False,
        last_event="Transcribing an explicit push-to-talk capture.",
    )
    try:
        client = OpenAI(api_key=api_key)
        response: Any = client.audio.transcriptions.create(
            model=os.getenv("ORION_TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe"),
            file=(clean_name, content, content_type),
        )
        transcript = str(getattr(response, "text", "") or "").strip()
        if not transcript:
            raise VoiceTranscriptionError("The transcription provider returned no speech.")
    except VoiceTranscriptionError:
        update_voice_state(
            mode="transcription_failed",
            listening=False,
            last_event="Voice transcription returned no usable speech.",
        )
        raise
    except Exception as error:
        update_voice_state(
            mode="provider_unavailable",
            listening=False,
            last_event="Voice transcription failed safely; no transcript was submitted.",
        )
        raise VoiceTranscriptionError(
            "Voice transcription provider unavailable. Review provider settings and retry."
        ) from error

    update_voice_state(
        mode="review_required",
        listening=False,
        last_transcript=transcript,
        last_event="Voice transcript is waiting for explicit user review.",
    )
    return transcript
