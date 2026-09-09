"""Utility skills: travel, safety, health. Public SA numbers only — not medical advice."""


def travel_reply(user_text: str) -> str:
    text = user_text.lower()
    if any(c in text for c in ("cape town", "kaapstad", "ct")):
        return (
            "Cape Town: check the wind and mountain weather before you go out. "
            "Ask me “weather in Cape Town”. Keep valuables zipped; tell someone your route if you hike."
        )
    if any(c in text for c in ("johannesburg", "joburg", "jozi", "jhb")):
        return (
            "Johannesburg: plan daylight travel where you can, use vetted taxis or Gautrain, "
            "and ask me “weather in Johannesburg” before you leave."
        )
    if "durban" in text:
        return (
            "Durban: humid and warm most of the year. Swim only at guarded beaches. "
            "Ask me “weather in Durban” for today’s forecast."
        )
    if "pretoria" in text or "tshwane" in text:
        return (
            "Pretoria / Tshwane: thunderstorms in summer afternoons are common. "
            "Ask me “weather in Pretoria”."
        )
    return (
        "Travel with Lentswe: pick a city chip, or say “weather in Cape Town”. "
        "I give forecasts and practical SA tips — I do not book tickets. "
        "Share your live location with a person you trust, not with this app."
    )


def safety_reply() -> str:
    return (
        "South Africa emergency numbers (from any phone, including many lock screens):\n"
        "• 112 — emergency (cellphone)\n"
        "• 10111 — police (SAPS)\n"
        "• 10177 — ambulance\n"
        "If you are in immediate danger, call — do not only chat with me. "
        "I cannot send police or share your GPS."
    )


def health_reply(user_text: str) -> str:
    text = user_text.lower()
    if any(
        w in text
        for w in ("suicid", "kill myself", "end my life", "want to die", "self harm")
    ):
        return (
            "Please get human help now. In South Africa you can call SADAG on 0800 567 567 "
            "or emergency 112. I am a voice app, not a counsellor."
        )
    return (
        "Health and wellbeing: I am not a doctor. I can remind you to drink water, "
        "breathe for a minute, or open your task list. "
        "Mental health: SADAG 0800 567 567. Emergency: 112. "
        "A BMI tool is a separate project — I will not guess your health from a chat."
    )


def productivity_reply() -> str:
    return (
        "Productivity: add tasks in the Tasks panel, or say “add to my list buy bread”. "
        "Say “what’s on my list” to hear them. I store the list on this device only."
    )


def goals_reply() -> str:
    return (
        "Goals live on this device. Open the Goals panel, or say “my goal is finish the weather app”. "
        "Say “what are my goals” to hear them. I do not upload your goals to a server."
    )


def learning_reply(user_text: str) -> str:
    text = user_text.lower()
    lessons = {
        "zulu": "isiZulu: Sawubona is hello to one person. Sanibonani is hello to a group. Ngiyabonga is thank you.",
        "xhosa": "isiXhosa: Molo is hello to one person. Molweni is hello to a group. Enkosi is thank you.",
        "sepedi": "Sepedi: Dumela is hello to one person. Dumelang is hello to a group. Ke a leboga is thank you.",
        "afrikaans": "Afrikaans: Hallo is hello. Dankie is thank you. Totsiens is goodbye.",
    }
    for key, line in lessons.items():
        if key in text:
            return line + " Tap a greeting chip and listen to Lentswe’s synthetic voice — we do not copy YouTube audio."
    return (
        "Learning: I can drill SA greetings. Say “teach me isiZulu”, “teach me isiXhosa”, or “teach me Sepedi”. "
        "Or use Lentswe says all 11. This is practice, not a university course."
    )


def route_skill(user_text: str) -> str | None:
    text = user_text.lower()
    if any(
        w in text
        for w in (
            "emergency",
            "police",
            "ambulance",
            "10111",
            "10177",
            "safety",
            "not safe",
            "danger",
        )
    ):
        return safety_reply()
    if any(
        w in text
        for w in (
            "suicid",
            "kill myself",
            "sadag",
            "mental health",
            "wellbeing",
            "well-being",
            "drink water",
            "hydrate",
        )
    ) or ("health" in text and "weather" not in text):
        return health_reply(user_text)
    if any(w in text for w in ("teach me", "learn", "lesson", "practice greeting", "drill")):
        return learning_reply(user_text)
    if any(w in text for w in ("my goal", "goals", "new year", "ambition")):
        return goals_reply()
    if any(w in text for w in ("travel", "trip", "pack", "airport", "flight", "hike")):
        return travel_reply(user_text)
    if any(w in text for w in ("productivity", "be productive", "focus")):
        return productivity_reply()
    return None
