from __future__ import annotations

import asyncio
import io
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv

from src.languages import SOUTH_AFRICAN_LANGUAGES

load_dotenv()

# Google and Microsoft have no dedicated Setswana / Xitsonga / Tshivenda / …
# neural voices. Ava Multilingual still produces audio (not a native speaker).
MULTILINGUAL_EDGE = "en-US-AvaMultilingualNeural"


def speak(text: str, language_id: str) -> bytes | None:
    """Dedicated Microsoft voices, then Meta MMS (native-language), then Google, then multilingual."""
    meta = SOUTH_AFRICAN_LANGUAGES.get(language_id) or SOUTH_AFRICAN_LANGUAGES["english"]

    if meta.edge_tts_voice:
        try:
            return asyncio.run(_edge_mp3(text, meta.edge_tts_voice))
        except Exception:
            pass

    try:
        from src.mms_tts import speak_mms

        audio = speak_mms(text, meta.mms_code)
        if audio:
            return audio
    except Exception:
        pass

    if meta.gtts_lang:
        audio = _gtts_mp3(text, meta.gtts_lang)
        if audio:
            return audio

    try:
        return asyncio.run(_edge_mp3(text, MULTILINGUAL_EDGE))
    except Exception:
        pass

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key:
        return _openai_speech(text, meta.name, api_key)
    return None


def _gtts_mp3(text: str, lang: str) -> bytes | None:
    try:
        from gtts import gTTS

        buf = io.BytesIO()
        gTTS(text=text, lang=lang, lang_check=False, slow=False).write_to_fp(buf)
        return buf.getvalue()
    except Exception:
        return None


async def _edge_mp3(text: str, voice: str) -> bytes:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate="-12%")
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        path = Path(tmp.name)
    try:
        await communicate.save(str(path))
        return path.read_bytes()
    finally:
        path.unlink(missing_ok=True)


def _openai_speech(text: str, language_name: str, api_key: str) -> bytes | None:
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=os.getenv("OPENAI_BASE_URL") or None)
        speech = client.audio.speech.create(
            model=os.getenv("TTS_MODEL", "gpt-4o-mini-tts"),
            voice=os.getenv("TTS_VOICE", "coral"),
            input=text,
            instructions=f"Speak as a native {language_name} speaker from South Africa.",
        )
        return speech.read()
    except Exception:
        return None
