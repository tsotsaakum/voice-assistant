"""Per-conversation custom memory.

Same idea as the FastAPI + Groq tutorial: a dictionary of chats keyed by
``conversation_id``, each with its own message list and an active flag.
Lentswe persists the dict to ``data/conversations.json`` so a browser refresh
can restore this chat without mixing it with another tab or user.
"""

from __future__ import annotations

import json
import re
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DATA = ROOT / "data" / "conversations.json"
DATA = _DEFAULT_DATA

SESSION_ENDED = "This chat session has ended. Start a new session to keep talking."

SYSTEM_CONTENT = (
    "You are Lentswe, a useful South African voice assistant. "
    "Remember facts the user shares in this conversation (name, preferences) "
    "and use them in later turns. Do not mix this chat with other conversation IDs."
)

_NAME_STATED = re.compile(
    r"(?i)\b(?:my name is|i am called|i'm called|call me)\s+"
    r"([A-Za-z][A-Za-z'\-]+(?:\s+[A-Za-z][A-Za-z'\-]+)?)"
)

_LOCK = threading.Lock()
_STORE: dict[str, Conversation] = {}
_LOADED = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class Conversation:
    conversation_id: str
    messages: list[dict] = field(default_factory=list)
    active: bool = True
    created_at: str = ""
    updated_at: str = ""

    def __post_init__(self) -> None:
        stamp = _now()
        if not self.created_at:
            self.created_at = stamp
        if not self.updated_at:
            self.updated_at = stamp
        if not self.messages:
            self.messages = [{"role": "system", "content": SYSTEM_CONTENT}]

    def chat_history(self) -> list[dict]:
        return [
            {"role": str(m.get("role")), "content": str(m.get("content"))}
            for m in self.messages
            if m.get("role") in {"user", "assistant"} and m.get("content")
        ]

    def append(self, role: str, content: str) -> None:
        self.messages.append({"role": role, "content": content})
        self.updated_at = _now()
        system = [m for m in self.messages if m.get("role") == "system"][:1]
        rest = [m for m in self.messages if m.get("role") != "system"][-40:]
        self.messages = system or [{"role": "system", "content": SYSTEM_CONTENT}]
        self.messages.extend(rest)

    def turn_count(self) -> int:
        return sum(1 for m in self.messages if m.get("role") in {"user", "assistant"})

    def to_dict(self) -> dict:
        return {
            "conversation_id": self.conversation_id,
            "messages": self.messages,
            "active": self.active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Conversation:
        return cls(
            conversation_id=str(data.get("conversation_id") or ""),
            messages=list(data.get("messages") or []),
            active=bool(data.get("active", True)),
            created_at=str(data.get("created_at") or ""),
            updated_at=str(data.get("updated_at") or ""),
        )


def configure(path: Path | None = None) -> None:
    """Point the store at a file (tests) and clear cached conversations."""
    global DATA, _LOADED
    with _LOCK:
        DATA = Path(path) if path is not None else _DEFAULT_DATA
        _STORE.clear()
        _LOADED = False


def _load() -> None:
    global _LOADED
    if _LOADED:
        return
    DATA.parent.mkdir(parents=True, exist_ok=True)
    if DATA.exists():
        try:
            raw = json.loads(DATA.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            raw = {}
        items = raw.get("conversations") if isinstance(raw, dict) else None
        if isinstance(items, dict):
            for cid, row in items.items():
                if not isinstance(row, dict):
                    continue
                row.setdefault("conversation_id", cid)
                _STORE[str(cid)] = Conversation.from_dict(row)
    _LOADED = True


def _save() -> None:
    DATA.parent.mkdir(parents=True, exist_ok=True)
    payload = {cid: conv.to_dict() for cid, conv in _STORE.items()}
    DATA.write_text(json.dumps({"conversations": payload}, indent=2), encoding="utf-8")


def new_conversation_id() -> str:
    return uuid.uuid4().hex[:12]


def get_or_create(conversation_id: str | None) -> Conversation:
    with _LOCK:
        _load()
        cid = (conversation_id or "").strip() or new_conversation_id()
        if cid not in _STORE:
            _STORE[cid] = Conversation(conversation_id=cid)
            _save()
        return _STORE[cid]


def seed_client_history(conversation: Conversation, history: list[dict], current_text: str) -> None:
    """Copy browser history into an empty server chat, dropping the current user line."""
    with _LOCK:
        if conversation.turn_count() > 0:
            return
        turns = [
            turn
            for turn in history or []
            if turn.get("role") in {"user", "assistant"} and turn.get("content")
        ]
        if (
            turns
            and turns[-1].get("role") == "user"
            and str(turns[-1].get("content") or "").strip() == current_text.strip()
        ):
            turns = turns[:-1]
        for turn in turns:
            conversation.append(str(turn["role"]), str(turn["content"]))
        if turns:
            _save()


def record_turn(conversation_id: str, user_text: str, assistant_text: str) -> Conversation:
    with _LOCK:
        _load()
        conv = _STORE.get(conversation_id) or Conversation(conversation_id=conversation_id)
        _STORE[conversation_id] = conv
        conv.append("user", user_text)
        conv.append("assistant", assistant_text)
        _save()
        return conv


def append_message(conversation_id: str, role: str, content: str) -> Conversation | None:
    with _LOCK:
        _load()
        conv = _STORE.get(conversation_id)
        if not conv or not conv.active:
            return None
        if role not in {"user", "assistant"} or not content.strip():
            return conv
        conv.append(role, content.strip())
        _save()
        return conv


def end_conversation(conversation_id: str) -> Conversation | None:
    with _LOCK:
        _load()
        conv = _STORE.get(conversation_id)
        if not conv:
            return None
        conv.active = False
        conv.updated_at = _now()
        _save()
        return conv


def snapshot(conversation_id: str) -> dict | None:
    with _LOCK:
        _load()
        conv = _STORE.get(conversation_id)
        if not conv:
            return None
        return public_payload(conv)


def public_payload(conv: Conversation) -> dict:
    return {
        "conversation_id": conv.conversation_id,
        "active": conv.active,
        "turn_count": conv.turn_count(),
        "messages": conv.chat_history(),
    }


def parse_stated_name(text: str) -> str | None:
    match = _NAME_STATED.search(text or "")
    if not match:
        return None
    name = match.group(1).strip()
    if name.lower() in {"lentswe", "you", "me"}:
        return None
    return name


def remembered_name(history: list[dict]) -> str | None:
    found = None
    for turn in history:
        if turn.get("role") != "user":
            continue
        name = parse_stated_name(str(turn.get("content") or ""))
        if name:
            found = name
    return found


def is_name_question(text: str) -> bool:
    lowered = (text or "").lower().strip()
    if "your name" in lowered or "who are you" in lowered:
        return False
    if parse_stated_name(text):
        return False
    cues = (
        "what is my name",
        "what's my name",
        "whats my name",
        "do you remember my name",
        "remember my name",
        "what was my name",
    )
    return any(cue in lowered for cue in cues)


def name_reply(history: list[dict]) -> str:
    name = remembered_name(history)
    if name:
        return f"Your name is {name}. I remember it from this chat session."
    return "I do not have your name in this chat yet. Tell me: my name is …"


def stated_name_reply(name: str) -> str:
    return f"Got it. I will remember your name is {name} in this chat session."
