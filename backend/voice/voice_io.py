import os
import wave
from pathlib import Path

import sounddevice as sd
import pyttsx3
from openai import OpenAI

from core.voice_state import update_voice_state


AUDIO_DIR = Path("backend/data/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def record_voice(duration: int = 6, sample_rate: int = 16000) -> Path:
    """
    Record microphone audio and save it as a WAV file.
    """
    file_path = AUDIO_DIR / "voice_input.wav"

    update_voice_state(
        mode="recording",
        listening=True,
        last_event=f"Recording voice for {duration} seconds.",
    )

    print(f"\nRecording for {duration} seconds...")
    print("Speak now...")

    audio = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="int16",
    )
    sd.wait()

    with wave.open(str(file_path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())

    update_voice_state(
        mode="recorded",
        listening=False,
        last_event=f"Audio saved: {file_path}",
    )

    print(f"Audio saved: {file_path}")
    return file_path


def transcribe_voice(audio_path: Path) -> str:
    """
    Convert recorded voice audio into text.
    """
    update_voice_state(
        mode="transcribing",
        listening=False,
        last_event="Transcribing voice input.",
    )

    with audio_path.open("rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file,
        )

    text = transcript.text.strip()

    update_voice_state(
        mode="transcribed",
        last_transcript=text,
        last_event="Voice transcription completed.",
    )

    print(f"You said: {text}")
    return text


def prepare_voice_reply(text: str, max_chars: int = 420) -> str:
    """
    Shorten long assistant responses for spoken output.
    The full response still appears in Aurora OS / terminal.
    """
    clean_text = " ".join(text.split())

    if len(clean_text) <= max_chars:
        return clean_text

    shortened = clean_text[:max_chars].rsplit(" ", 1)[0]

    return (
        shortened
        + "... I have shown the full response on Aurora OS."
    )


def speak_text(text: str, concise: bool = True) -> None:
    """
    Speak O.R.I.O.N.'s response using local text-to-speech.
    """
    spoken_text = prepare_voice_reply(text) if concise else text

    update_voice_state(
        mode="speaking",
        last_response=spoken_text,
        last_event="O.R.I.O.N. is speaking.",
    )

    print(f"O.R.I.O.N. voice: {spoken_text}")

    engine = pyttsx3.init()
    engine.setProperty("rate", 175)
    engine.setProperty("volume", 1.0)
    engine.say(spoken_text)
    engine.runAndWait()

    update_voice_state(
        mode="idle",
        last_event="O.R.I.O.N. finished speaking.",
    )
