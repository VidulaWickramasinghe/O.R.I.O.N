import os
import wave
from pathlib import Path

import sounddevice as sd
import pyttsx3
from dotenv import load_dotenv
from openai import OpenAI


BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BACKEND_DIR / ".env"
AUDIO_DIR = BACKEND_DIR / "data" / "audio"

AUDIO_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(dotenv_path=ENV_PATH)


def get_openai_client() -> OpenAI:
    """
    Create the OpenAI client only when needed.
    This prevents import-time API key errors.
    """
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError(
            f"Missing OPENAI_API_KEY. Add it to this file: {ENV_PATH}"
        )

    return OpenAI(api_key=api_key)


def record_voice(duration: int = 6, sample_rate: int = 16000) -> Path:
    """
    Record microphone audio and save it as a WAV file.
    """
    file_path = AUDIO_DIR / "voice_input.wav"

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

    print(f"Audio saved: {file_path}")
    return file_path


def transcribe_voice(audio_path: Path) -> str:
    """
    Convert recorded voice audio into text.
    """
    client = get_openai_client()

    with audio_path.open("rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file,
        )

    text = transcript.text.strip()
    print(f"You said: {text}")
    return text


def speak_text(text: str) -> None:
    """
    Speak O.R.I.O.N.'s response using local text-to-speech.
    """
    print(f"O.R.I.O.N. voice: {text}")

    engine = pyttsx3.init()
    engine.setProperty("rate", 175)
    engine.say(text)
    engine.runAndWait()
