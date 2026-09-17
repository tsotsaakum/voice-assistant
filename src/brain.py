"""Brain: wake, hard safety, then Groq tools if a key is set, else keyword tools."""

from src.browse import open_web_search
from src.chat import openai_enabled, reply
from src.conversations import (
    SESSION_ENDED,
    get_or_create,
    is_name_question,
    name_reply,
    parse_stated_name,
    record_turn,
    seed_client_history,
    stated_name_reply,
)
from src.custom_commands import try_custom_command
from src.intents import local_reply
from src.knowledge import ask_to_be_taught, complete_pending, trained_reply
from src.mail import try_send_email
from src.memory import Memory
from src.reminders import try_set_reminder
from src.skills import music_reply, route_skill
from src.system import current_date, current_time, status_line, stop_reply, volume_reply
from src.tools import EMERGENCY, emergency_info, run_tool
from src.wake_word import is_wake_only, strip_wake, wake_greeting
from src.weather import forecast, is_pack_query, is_run_query, is_weather_query, pack_for_trip, run_today_reply


def think(
    user_text: str,
    language_id: str,
    history: list[dict] | None = None,
    conversation_id: str | None = None,
) -> str:
    history = history or []
    conv = None
    if conversation_id is not None:
        conv = get_or_create(conversation_id)
        if not conv.active:
            return SESSION_ENDED

    if is_wake_only(user_text):
        answer = wake_greeting()
        _remember(conv, user_text, answer)
        return answer
    user_text = strip_wake(user_text)
    if not user_text:
        answer = wake_greeting()
        _remember(conv, "hello", answer)
        return answer

    if conv is not None:
        if conv.turn_count() == 0:
            seed_client_history(conv, history, user_text)
        history = conv.chat_history()
    else:
        memory = Memory()
        for turn in history:
            role = turn.get("role")
            content = turn.get("content")
            if role in {"user", "assistant"} and content:
                memory.add(role, content)
        history = memory.history()

    answer = _reply(user_text, language_id, history, conversation_id)
    _remember(conv, user_text, answer)
    return answer


def _remember(conv, user_text: str, answer: str) -> None:
    if conv is None or not conv.active:
        return
    record_turn(conv.conversation_id, user_text, answer)


def _reply(
    user_text: str,
    language_id: str,
    history: list[dict],
    conversation_id: str | None = None,
) -> str:
    text = user_text.lower()
    if any(p in text for p in EMERGENCY):
        return emergency_info()
    pending = complete_pending(conversation_id, user_text)
    if pending:
        return pending
    if is_name_question(user_text):
        return name_reply(history)
    stated = parse_stated_name(user_text)
    if stated and not openai_enabled():
        return stated_name_reply(stated)
    trained = trained_reply(user_text)
    if trained:
        return trained
    if any(word in text for word in ("status", "are you running", "are you on")):
        return status_line()
    if any(word in text for word in ("what date", "today's date", "the date")):
        return f"Today is {current_date()}."
    if any(word in text for word in ("what time", "the time", "what's the time", "whats the time")):
        return f"The time is {current_time()}."
    if any(
        word in text
        for word in ("stop listening", "stop talking", "be quiet", "thula", "khutsa")
    ):
        return stop_reply()
    if "volume" in text or "louder" in text or "quieter" in text:
        return volume_reply(user_text)

    reminder = try_set_reminder(user_text)
    if reminder:
        return reminder
    custom = try_custom_command(user_text)
    if custom:
        return custom
    mailed = try_send_email(user_text)
    if mailed:
        return mailed

    if is_pack_query(user_text):
        return pack_for_trip(user_text)
    if is_run_query(user_text):
        return run_today_reply(user_text)
    if any(
        w in text
        for w in (
            "play music",
            "play a song",
            "play me a song",
            "spotify",
            "youtube music",
            "open music",
            "music tab",
        )
    ):
        return music_reply()
    if any(word in text for word in ("search", "google", "look up", "batla", "funa")):
        return open_web_search(user_text)

    if openai_enabled():
        tool = run_tool(user_text)
        if tool:
            return tool
        return reply(user_text, language_id, history)

    if is_weather_query(user_text):
        return forecast(user_text)
    if any(word in text for word in ("search", "google", "look up", "batla", "funa")):
        return open_web_search(user_text)
    tool = run_tool(user_text)
    if tool:
        return tool
    skill = route_skill(user_text)
    if skill:
        return skill
    found = local_reply(user_text, language_id)
    if found:
        return found
    return ask_to_be_taught(user_text, conversation_id)
