"""Brain: send the user to the right skill (weather, search, chat)."""

from src.chat import reply
from src.web_search import search
from src.weather import forecast
from src.wake_word import strip_wake
from src.memory import Memory
from src.system import current_date, status_line, stop_reply, volume_reply
from src.skills import route_skill


def think(user_text: str, language_id: str, history: list[dict]) -> str:
    user_text = strip_wake(user_text)
    memory = Memory()
    for turn in history:
        role = turn.get("role")
        content = turn.get("content")
        if role in {"user", "assistant"} and content:
            memory.add(role, content)

    text = user_text.lower()
    if any(word in text for word in ("status", "are you running", "are you on")):
        return status_line()
    if any(word in text for word in ("what date", "today's date", "the date")):
        return f"Today is {current_date()}."
    if any(
        word in text
        for word in ("stop listening", "stop talking", "be quiet", "thula", "khutsa")
    ):
        return stop_reply()
    if "volume" in text or "louder" in text or "quieter" in text:
        return volume_reply(user_text)
    if any(
        word in text
        for word in (
            "weather",
            "temperature",
            "forecast",
            "how hot",
            "how cold",
            "isirimo",
            "lehodu",
            "pula",
            "mvula",
        )
    ):
        return forecast(user_text)
    if any(word in text for word in ("search", "google", "look up", "batla", "funa")):
        return search(user_text)
    skill = route_skill(user_text)
    if skill:
        return skill
    return reply(user_text, language_id, memory.history())