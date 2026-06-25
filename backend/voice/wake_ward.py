import re
from voice.voice_io import record_voice, transcribe_voice


WAKE_VARIANTS = [
    "hey orion",
    "hi orion",
    "orion",
    "hey o r i o n",
    "hey onion",
    "hi onion",
]


def normalize_text(text: str) -> str:
    """
    Normalize speech text so wake phrase detection is more forgiving.
    """
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def detect_wake_phrase(text: str) -> bool:
    """
    Check whether the user said the wake phrase.
    """
    normalized = normalize_text(text)

    return any(variant in normalized for variant in WAKE_VARIANTS)


def extract_command_after_wake_phrase(text: str) -> str:
    """
    Extract command text after wake phrase if the user says:
    'Hey Orion, list my projects'
    """
    normalized = normalize_text(text)

    for variant in WAKE_VARIANTS:
        if variant in normalized:
            command = normalized.split(variant, 1)[1].strip()
            return command

    return ""


def listen_for_wake_phrase() -> str:
    """
    Listen in short cycles until wake phrase is detected.
    If command is included after wake phrase, return it.
    Otherwise, record a second command phrase.
    """
    print("\nO.R.I.O.N. is listening for wake phrase...")
    print('Say: "Hey Orion"')

    while True:
        audio_path = record_voice(duration=3)
        heard_text = transcribe_voice(audio_path)

        if not heard_text:
            continue

        print(f"Heard: {heard_text}")

        if detect_wake_phrase(heard_text):
            print("Wake phrase detected.")

            command = extract_command_after_wake_phrase(heard_text)

            if command:
                return command

            print("Listening for command...")
            command_audio = record_voice(duration=7)
            command_text = transcribe_voice(command_audio)

            return command_text.strip()


	def listen_for_wake_phrase(*args, **kwargs):
    		"""
    		Compatibility wrapper used by wake_main.py.
    		It maps listen_for_wake_phrase() to the existing wake-word listener.
    		"""
    		return listen_for_wake_word(*args, **kwargs)
