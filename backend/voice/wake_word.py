import re
from voice.voice_io import record_voice, transcribe_voice
from core.voice_state import update_voice_state


WAKE_VARIANTS = [
    "hey orion",
    "hi orion",
    "okay orion",
    "ok orion",
    "orion",
    "hey o r i o n",
    "hey onion",
    "hi onion",
]

SLEEP_COMMANDS = [
    "sleep",
    "go to sleep",
    "stand down",
    "pause listening",
]

SHUTDOWN_COMMANDS = [
    "stop",
    "shutdown",
    "shut down",
    "exit",
    "quit",
]


def normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def detect_wake_phrase(text: str) -> bool:
    normalized = normalize_text(text)
    return any(variant in normalized for variant in WAKE_VARIANTS)


def extract_command_after_wake_phrase(text: str) -> str:
    normalized = normalize_text(text)

    for variant in WAKE_VARIANTS:
        if variant in normalized:
            return normalized.split(variant, 1)[1].strip()

    return ""


def is_sleep_command(text: str) -> bool:
    normalized = normalize_text(text)
    return normalized in SLEEP_COMMANDS


def is_shutdown_command(text: str) -> bool:
    normalized = normalize_text(text)
    return normalized in SHUTDOWN_COMMANDS


def listen_for_wake_phrase() -> str:
    """
    Listen in short cycles until the wake phrase is detected.
    If command is included after wake phrase, return it.
    Otherwise, record a second command phrase.
    """
    update_voice_state(
        mode="wake_listening",
        listening=True,
        last_event='Listening for wake phrase: "Hey Orion".',
    )

    print("\nO.R.I.O.N. is listening for wake phrase...")
    print('Say: "Hey Orion"')

    while True:
        audio_path = record_voice(duration=3)
        heard_text = transcribe_voice(audio_path)

        if not heard_text:
            update_voice_state(
                mode="wake_listening",
                listening=True,
                last_event="No speech detected during wake listening.",
            )
            continue

        print(f"Heard: {heard_text}")

        if detect_wake_phrase(heard_text):
            update_voice_state(
                mode="wake_detected",
                listening=False,
                last_event="Wake phrase detected.",
                last_transcript=heard_text,
            )

            print("Wake phrase detected.")

            command = extract_command_after_wake_phrase(heard_text)

            if command:
                return command

            update_voice_state(
                mode="command_listening",
                listening=True,
                last_event="Listening for command after wake phrase.",
            )

            print("Listening for command...")
            command_audio = record_voice(duration=7)
            command_text = transcribe_voice(command_audio)

            update_voice_state(
                mode="command_received",
                listening=False,
                last_transcript=command_text,
                last_event="Command captured after wake phrase.",
            )

            return command_text.strip()
