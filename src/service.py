"""Shared request handlers used by the Flask UI and the FastAPI backend."""

from __future__ import annotations

from src.brain import think
from src.conversations import get_or_create, public_payload, snapshot


def chat_payload(
    text: str,
    language: str,
    history: list | None,
    conversation_id: str | None,
) -> dict:
    conv = get_or_create(conversation_id)
    answer = think(text, language, history or [], conversation_id=conv.conversation_id)
    live = snapshot(conv.conversation_id) or public_payload(conv)
    return {
        "reply": answer,
        "language": language,
        "conversation_id": live["conversation_id"],
        "active": live["active"],
        "turn_count": live["turn_count"],
    }
