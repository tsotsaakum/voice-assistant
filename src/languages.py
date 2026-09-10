"""South Africa's 11 official languages — STT locales and TTS voices."""
from dataclasses import dataclass


@dataclass
class LanguageInfo:
    name: str
    native: str
    stt: str
    edge_tts_voice: str | None = None
    gtts_lang: str | None = None
    mms_code: str | None = None
    hf_tts_repos: tuple[str, ...] = ()
    voice_kind: str = "fallback"


SOUTH_AFRICAN_LANGUAGES: dict[str, LanguageInfo] = {
    "english": LanguageInfo(
        "English (South Africa)",
        "English",
        "en-ZA",
        edge_tts_voice="en-ZA-LeahNeural",
        gtts_lang="en",
        voice_kind="edge",
    ),
    "afrikaans": LanguageInfo(
        "Afrikaans",
        "Afrikaans",
        "af-ZA",
        edge_tts_voice="af-ZA-AdriNeural",
        gtts_lang="af",
        hf_tts_repos=("UBC-NLP/Simba-TTS-afr",),
        voice_kind="edge",
    ),
    "zulu": LanguageInfo(
        "isiZulu",
        "isiZulu",
        "zu-ZA",
        edge_tts_voice="zu-ZA-ThandoNeural",
        gtts_lang="zu",
        voice_kind="edge",
    ),
    "xhosa": LanguageInfo(
        "isiXhosa",
        "isiXhosa",
        "xh-ZA",
        gtts_lang="xh",
        hf_tts_repos=("UBC-NLP/Simba-TTS-xho",),
        voice_kind="simba",
    ),
    "sepedi": LanguageInfo("Sepedi", "Sepedi", "nso-ZA", gtts_lang="nso", voice_kind="fallback"),
    "sesotho": LanguageInfo(
        "Sesotho",
        "Sesotho",
        "st-ZA",
        hf_tts_repos=("UBC-NLP/Simba-TTS-sot",),
        voice_kind="simba",
    ),
    "setswana": LanguageInfo(
        "Setswana",
        "Setswana",
        "tn-ZA",
        hf_tts_repos=("UBC-NLP/Simba-TTS-tsn",),
        voice_kind="simba",
    ),
    "tsonga": LanguageInfo(
        "Xitsonga",
        "Xitsonga",
        "ts-ZA",
        mms_code="tso",
        hf_tts_repos=("facebook/mms-tts-tso",),
        voice_kind="mms",
    ),
    "swati": LanguageInfo("siSwati", "siSwati", "ss-ZA", voice_kind="fallback"),
    "venda": LanguageInfo("Tshivenda", "Tshivenda", "ve-ZA", voice_kind="fallback"),
    "ndebele": LanguageInfo("isiNdebele", "isiNdebele", "nr-ZA", voice_kind="fallback"),
}

AUTO_TRY_ORDER = [
    "english",
    "afrikaans",
    "sepedi",
    "zulu",
    "xhosa",
    "setswana",
    "tsonga",
    "sesotho",
    "swati",
    "venda",
    "ndebele",
]


def public_language_list() -> list[dict]:
    return [
        {
            "id": key,
            "name": meta.name,
            "native": meta.native,
            "spoken": True,
            "voice": meta.voice_kind,
        }
        for key, meta in SOUTH_AFRICAN_LANGUAGES.items()
    ]
