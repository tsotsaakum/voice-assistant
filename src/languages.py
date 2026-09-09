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


SOUTH_AFRICAN_LANGUAGES: dict[str, LanguageInfo] = {
    "english": LanguageInfo("English (South Africa)", "English", "en-ZA", edge_tts_voice="en-ZA-LeahNeural", gtts_lang="en", mms_code="eng"),
    "afrikaans": LanguageInfo("Afrikaans", "Afrikaans", "af-ZA", edge_tts_voice="af-ZA-AdriNeural", gtts_lang="af", mms_code="afr"),
    "zulu": LanguageInfo(
        "isiZulu",
        "isiZulu",
        "zu-ZA",
        edge_tts_voice="zu-ZA-ThandoNeural",
        gtts_lang="zu",
        mms_code="zul",
    ),
    "xhosa": LanguageInfo("isiXhosa", "isiXhosa", "xh-ZA", gtts_lang="xh", mms_code="xho"),
    "sepedi": LanguageInfo("Sepedi", "Sepedi", "nso-ZA", gtts_lang="nso", mms_code="nso"),
    "sesotho": LanguageInfo("Sesotho", "Sesotho", "st-ZA", mms_code="sot"),
    "setswana": LanguageInfo("Setswana", "Setswana", "tn-ZA", mms_code="tsn"),
    "tsonga": LanguageInfo("Xitsonga", "Xitsonga", "ts-ZA", mms_code="tso"),
    "swati": LanguageInfo("siSwati", "siSwati", "ss-ZA", mms_code="ssw"),
    "venda": LanguageInfo("Tshivenda", "Tshivenda", "ve-ZA", mms_code="ven"),
    "ndebele": LanguageInfo("isiNdebele", "isiNdebele", "nr-ZA", mms_code="nbl"),
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
        }
        for key, meta in SOUTH_AFRICAN_LANGUAGES.items()
    ]
