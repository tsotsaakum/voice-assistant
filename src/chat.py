from __future__ import annotations

import os

from dotenv import load_dotenv

from src.intents import guess_language, local_reply
from src.languages import SOUTH_AFRICAN_LANGUAGES

load_dotenv()

SYSTEM_PROMPT = """You are Lentswe, a warm South African voice assistant built as a student portfolio project.
You understand South African English accents and slang (howzit, lekker, eish, sharp, yoh, just now),
and code-switching across the 11 official languages.

Always reply in {language_name} only.
Keep replies short enough to speak aloud (2–4 sentences).
If the transcript looks slightly wrong, infer the intended meaning.
When the user speaks Sepedi, use natural Sepedi (Sesotho sa Leboa), not Sesotho from Lesotho.
Be accurate and respectful with isiXhosa and Setswana as well.
"""


def reply(user_text: str, language_id: str, history: list[dict]) -> str:
    if language_id not in SOUTH_AFRICAN_LANGUAGES:
        language_id = guess_language(user_text) or "english"
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key:
        try:
            return _openai_reply(user_text, language_id, history, api_key)
        except Exception:
            pass
    found = local_reply(user_text, language_id)
    if found:
        return found
    return _echo_in_language(user_text, language_id)


def openai_enabled() -> bool:
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


def _openai_reply(user_text: str, language_id: str, history: list[dict], api_key: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url=os.getenv("OPENAI_BASE_URL") or None)
    model = os.getenv("CHAT_MODEL", "gpt-4o-mini")
    language_name = SOUTH_AFRICAN_LANGUAGES[language_id].name
    messages = [{"role": "system", "content": SYSTEM_PROMPT.format(language_name=language_name)}]
    for turn in history[-8:]:
        role = turn.get("role")
        content = turn.get("content")
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_text})
    result = client.chat.completions.create(model=model, messages=messages, temperature=0.6)
    return (result.choices[0].message.content or "").strip()


def _echo_in_language(user_text: str, language_id: str) -> str:
    templates = {
        "english": "I heard: {text}. Ask me who I am, what I can do, or the time — or add an OPENAI_API_KEY in .env for fuller answers.",
        "afrikaans": "Ek het gehoor: {text}. Vra wie ek is, wat ek kan doen, of die tyd.",
        "zulu": "Ngizwile: {text}. Ngibuze ukuthi ngingubani, ngenzeni, noma isikhathi.",
        "xhosa": "Ndivile: {text}. Ndibuze ukuba ndingubani, ndenza ntoni, okanye lixesha.",
        "sepedi": "Ke kwele: {text}. Mpotšiše gore ke mang, ke kgona go dira eng, goba nako ke efe.",
        "sesotho": "Ke u utloile: {text}. Mpotse hore na ke mang, ke khona ho etsa eng, kapa nako.",
        "setswana": "Ke utlwile: {text}. Mpotse gore ke mang, ke kgona go dira eng, kgotsa nako ke efe.",
        "tsonga": "Ndzi twile: {text}. Ndzi vutise leswaku ndzi mani, ndzi kota yini, kumbe nkarhi.",
        "swati": "Ngikuva: {text}. Ngibute kutsi ngingubani, ngenzeni, noma sikhatsi.",
        "venda": "Ndo u pfa: {text}. Mbudzisani uri ndi nnyi, ndi kona u ita mini, kana tshifhinga.",
        "ndebele": "Ngikuzwile: {text}. Ngibuze ukuthi ngingubani, ngenzeni, noma isikhathi.",
    }
    return templates.get(language_id, templates["english"]).format(text=user_text)
