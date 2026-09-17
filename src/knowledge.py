"""Teachable JSON knowledge base (Indently-style chatbot).

Users train lasting Q&A pairs. Matching uses ``difflib.get_close_matches``
(n=1, cutoff=0.6). Taught replies survive restart and New chat; they are
not the same as per-conversation custom memory.
"""

from __future__ import annotations

import json
import re
import threading
import uuid
from difflib import get_close_matches
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DATA = ROOT / "data" / "knowledge_base.json"
DATA = _DEFAULT_DATA

TEACH_PROMPT = (
    "I don't know the answer. Can you teach me? Type the answer, or skip to skip."
)
LEARNED = "Thank you! I learned a new response."
SKIPPED = "Skipped. I did not learn that one."
CUTOFF = 0.6

_TEACH_WHEN = re.compile(
    r"(?i)^when i (?:say|ask|type)\s+[\"']?(.+?)[\"']?\s*,\s*"
    r"(?:please\s+)?(?:reply|answer|say)\s+[\"']?(.+?)[\"']?\s*$"
)
_TEACH_ARROW = re.compile(
    r"(?i)^(?:please\s+)?teach(?:\s+me)?:\s*(.+?)\s*(?:->|→|\||then)\s*(.+)$"
)
_SKIP = frozenset({"skip", "skip it", "skip this"})

_LOCK = threading.Lock()
_CACHE: dict | None = None
_LOADED = False


def configure(path: Path | None = None) -> None:
    """Point the store at a file (tests) and drop the in-memory cache."""
    global DATA, _CACHE, _LOADED
    with _LOCK:
        DATA = Path(path) if path is not None else _DEFAULT_DATA
        _CACHE = None
        _LOADED = False


def _empty() -> dict:
    return {"questions": [], "pending": {}}


def _load() -> dict:
    global _CACHE, _LOADED
    if _LOADED and _CACHE is not None:
        return _CACHE
    DATA.parent.mkdir(parents=True, exist_ok=True)
    if not DATA.exists():
        _CACHE = _empty()
        _LOADED = True
        return _CACHE
    try:
        data = json.loads(DATA.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        data = _empty()
    if not isinstance(data, dict):
        data = _empty()
    questions = data.get("questions")
    if not isinstance(questions, list):
        questions = []
    cleaned = []
    for row in questions:
        if not isinstance(row, dict):
            continue
        question = str(row.get("question") or "").strip()
        answer = str(row.get("answer") or "").strip()
        if not question or not answer:
            continue
        item = {
            "id": str(row.get("id") or uuid.uuid4().hex[:8]),
            "question": question,
            "answer": answer,
        }
        cleaned.append(item)
    pending = data.get("pending")
    if not isinstance(pending, dict):
        pending = {}
    _CACHE = {"questions": cleaned, "pending": {str(k): str(v) for k, v in pending.items() if v}}
    _LOADED = True
    return _CACHE


def _save(data: dict) -> None:
    global _CACHE
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(data, indent=2), encoding="utf-8")
    _CACHE = data


def load_knowledge_base(file_path: str | None = None) -> dict:
    if file_path:
        path = Path(file_path)
        if not path.exists():
            return _empty()
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return _empty()
        return data if isinstance(data, dict) else _empty()
    with _LOCK:
        return json.loads(json.dumps(_load()))


def save_knowledge_base(file_path: str, data: dict) -> None:
    Path(file_path).write_text(json.dumps(data, indent=2), encoding="utf-8")


def find_best_match(user_question: str, questions: list[str]) -> str | None:
    """Closest stored question at >= 60% similarity, or None."""
    needles = [q for q in questions if q]
    if not user_question.strip() or not needles:
        return None
    lowered = [q.lower() for q in needles]
    matches: list[str] = get_close_matches(user_question.lower().strip(), lowered, n=1, cutoff=CUTOFF)
    if not matches:
        return None
    return needles[lowered.index(matches[0])]


def get_answer_for_question(question: str, knowledge_base: dict) -> str | None:
    target = (question or "").strip().lower()
    for row in knowledge_base.get("questions") or []:
        if str(row.get("question") or "").strip().lower() == target:
            return str(row.get("answer") or "") or None
    return None


def lookup(user_text: str) -> str | None:
    """Return the taught answer for the closest matching question, if any."""
    with _LOCK:
        data = _load()
        questions = [str(row.get("question") or "") for row in data["questions"]]
        match = find_best_match(user_text, questions)
        if not match:
            return None
        return get_answer_for_question(match, data)


def teach(question: str, answer: str) -> dict | None:
    """Store or update a Q&A pair. Empty question/answer is ignored."""
    q = (question or "").strip()
    a = (answer or "").strip()
    if not q or not a:
        return None
    with _LOCK:
        data = _load()
        for row in data["questions"]:
            if str(row.get("question") or "").strip().lower() == q.lower():
                row["answer"] = a
                _save(data)
                return row
        item = {"id": uuid.uuid4().hex[:8], "question": q, "answer": a}
        data["questions"].append(item)
        _save(data)
        return item


def forget(entry_id: str) -> bool:
    needle = (entry_id or "").strip()
    if not needle:
        return False
    with _LOCK:
        data = _load()
        before = len(data["questions"])
        data["questions"] = [row for row in data["questions"] if row.get("id") != needle]
        if len(data["questions"]) == before:
            return False
        _save(data)
        return True


def entries() -> list[dict]:
    with _LOCK:
        return list(_load()["questions"])


def set_pending(conversation_id: str | None, question: str) -> None:
    cid = (conversation_id or "").strip()
    q = (question or "").strip()
    if not cid or not q:
        return
    with _LOCK:
        data = _load()
        data.setdefault("pending", {})[cid] = q
        _save(data)


def pending_question(conversation_id: str | None) -> str | None:
    cid = (conversation_id or "").strip()
    if not cid:
        return None
    with _LOCK:
        pending = _load().get("pending")
        if not isinstance(pending, dict):
            return None
        value = str(pending.get(cid) or "").strip()
        return value or None


def clear_pending(conversation_id: str | None) -> None:
    cid = (conversation_id or "").strip()
    if not cid:
        return
    with _LOCK:
        data = _load()
        if cid in (data.get("pending") or {}):
            data["pending"].pop(cid, None)
            _save(data)


def is_skip(text: str) -> bool:
    return (text or "").strip().lower() in _SKIP


def parse_teach_command(text: str) -> tuple[str, str] | None:
    raw = (text or "").strip()
    for pattern in (_TEACH_WHEN, _TEACH_ARROW):
        match = pattern.match(raw)
        if match:
            question = match.group(1).strip().strip("\"'")
            answer = match.group(2).strip().strip("\"'")
            if question and answer:
                return question, answer
    return None


def complete_pending(conversation_id: str | None, user_text: str) -> str | None:
    """If this chat is waiting to be taught, save or skip. None if not pending."""
    question = pending_question(conversation_id)
    if not question:
        return None
    clear_pending(conversation_id)
    if is_skip(user_text):
        return SKIPPED
    taught = teach(question, user_text)
    return LEARNED if taught else SKIPPED


def trained_reply(user_text: str) -> str | None:
    """Explicit teach command, or a knowledge hit. Does not consume pending."""
    command = parse_teach_command(user_text)
    if command:
        teach(*command)
        return LEARNED
    return lookup(user_text)


def handle_turn(user_text: str, conversation_id: str | None) -> str | None:
    """Pending teach, explicit teach, or a knowledge hit. Else None."""
    pending = complete_pending(conversation_id, user_text)
    if pending:
        return pending
    return trained_reply(user_text)


def ask_to_be_taught(user_text: str, conversation_id: str | None) -> str:
    set_pending(conversation_id, user_text)
    return TEACH_PROMPT


def lasting_lines(limit: int = 12) -> str:
    rows = entries()[:limit]
    if not rows:
        return "none"
    return "; ".join(f"{row['question']} → {row['answer']}" for row in rows)
