"""Company desk: ChatNova-style console for Lentswe.

Settings, analytics, workflows, integrations, leads, bookings, handoff,
quotes, branded cards, and website embed — all on this computer.
Memory, Teach, Deploy, and Docs stay as they are.
"""

from __future__ import annotations

import json
import os
import re
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from xml.sax.saxutils import escape

from src.chat import chat_model
from src.mail import send_email
from src.rag import retrieve

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DATA = ROOT / "data" / "desk.json"
DATA = _DEFAULT_DATA

TONES = ("professional", "warm", "brief")
SAFETY_MODES = ("strict", "standard")
ASSISTANT_MODES = ("product_support", "sales", "general")
RATIOS = {"1:1": (512, 512), "16:9": (640, 360), "9:16": (360, 640)}

_LOCK = threading.Lock()
_CACHE: dict | None = None

_LEAD = re.compile(
    r"(?i)\b(?:capture|log|save)\s+(?:a\s+)?lead\s+"
    r"(?:for\s+)?([A-Za-z][A-Za-z'\-]+(?:\s+[A-Za-z][A-Za-z'\-]+)?)"
    r"(?:[,.]?\s*(?:phone|tel|whatsapp)?\s*(\+?\d[\d\s]{6,14}\d))?"
    r"(?:[,.]?\s*(\S+@\S+))?"
    r"(?:[,.]?\s+(?:wants|about|note)?\s*(.+))?"
)
_BOOK = re.compile(
    r"(?i)\bbook\b(?:\s+(?:a\s+)?(?:slot|appointment))?\s+"
    r"(?:for\s+)?([A-Za-z][A-Za-z'\-]+(?:\s+[A-Za-z][A-Za-z'\-]+)?)"
    r"(?:[,.]?\s+(?:at\s+)?(\d{1,2}:\d{2}))?"
    r"(?:[,.]?\s+(?:on\s+)?(\w+))?"
)
_HANDOFF = re.compile(
    r"(?i)\b("
    r"hand\s+(?:this\s+)?(?:off|over|to (?:a )?(?:human|person|staff))|"
    r"talk to a (?:human|person)|"
    r"speak to (?:a )?(?:human|person|staff)|"
    r"escalate"
    r")\b"
)
_QUOTE = re.compile(r"(?i)\b(?:quote|draft a quote)\b(?:\s+(?:for|a|an))?\s*(.+)")
_FOLLOW = re.compile(
    r"(?i)\b(?:draft|write)\s+(?:a\s+)?follow[- ]?up\s+"
    r"(?:to\s+)?(\S+@\S+)\s+(?:saying|that says|that|:)\s+(.+)"
)
_CONFIRM_FOLLOW = re.compile(r"(?i)\b(?:send|confirm)\s+(?:the\s+)?follow[- ]?up\b")
_TRANSLATE = re.compile(
    r"(?i)\btranslate\s+[“\"]?(.+?)[”\"]?\s+(?:to|into)\s+([A-Za-z ]+)$"
)
_CARD = re.compile(
    r"(?i)\b(?:make|create|generate)\s+(?:a\s+)?(?:card|image|poster)\b"
    r"(?:\s+(?:that says|saying|for))?\s*(.+)"
)
_DESK_CUES = (
    "desk status",
    "company desk",
    "ai performance",
    "analytics",
    "set up integrations",
    "setup integrations",
    "how do i embed",
    "website embed",
    "wordpress snippet",
    "shopify snippet",
    "slack integration",
    "what file types",
    "how to upload files",
    "watch tutorial",
    "see example",
    "smart routing",
    "lead capture",
    "follow-up email",
    "follow up email",
    "auto-responses",
    "auto responses",
    "product support assistant",
    "creativity slider",
    "safety mode",
)


PHRASES = {
    "hello": {
        "english": "Hello",
        "afrikaans": "Hallo",
        "zulu": "Sawubona",
        "xhosa": "Molo",
        "sepedi": "Dumela",
        "sesotho": "Dumela",
        "setswana": "Dumela",
        "tsonga": "Avuxeni",
        "swati": "Sawubona",
        "venda": "Ndaa",
        "ndebele": "Lotjhani",
    },
    "thank you": {
        "english": "Thank you",
        "afrikaans": "Dankie",
        "zulu": "Ngiyabonga",
        "xhosa": "Enkosi",
        "sepedi": "Ke a leboga",
        "sesotho": "Ke a leboha",
        "setswana": "Ke a leboga",
        "tsonga": "Inkomu",
        "swati": "Ngiyabonga",
        "venda": "Ndo livhuwa",
        "ndebele": "Ngiyathokoza",
    },
    "how can i help": {
        "english": "How can I help you today?",
        "afrikaans": "Hoe kan ek vandag help?",
        "zulu": "Ngingakusiza kanjani namuhla?",
        "xhosa": "Ndingakunceda njani namhlanje?",
        "sepedi": "Nka go thuša bjang lehono?",
        "sesotho": "Nka u thusa joang kajeno?",
        "setswana": "Nka go thusa jang gompieno?",
        "tsonga": "Ndzi nga ku pfuna njhani namuntlha?",
        "swati": "Ngingakusita kanjani namuhla?",
        "venda": "Ndi nga u thusa hani ṋamusi?",
        "ndebele": "Ngingakusiza njani namhlanje?",
    },
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None = None) -> str:
    return (dt or _now()).isoformat(timespec="seconds")


def _id() -> str:
    return uuid.uuid4().hex[:10]


def configure(path: Path | None = None) -> None:
    """Point the desk store at a file (tests) and drop the cache."""
    global DATA, _CACHE
    with _LOCK:
        DATA = Path(path) if path is not None else _DEFAULT_DATA
        _CACHE = None


def _empty() -> dict:
    return {
        "settings": {
            "model": chat_model(),
            "tone": "professional",
            "creativity": 35,
            "language": "english",
            "safety": "strict",
            "assistant_mode": "product_support",
        },
        "workflows": {
            "auto_responses": True,
            "smart_routing": True,
            "lead_capture": True,
            "follow_up": True,
        },
        "staff": {"username": "staff", "pin": "lentswe"},
        "logs": [],
        "leads": [],
        "bookings": [],
        "handoffs": [],
        "followups": [],
        "quotes": [],
        "cards": [],
    }


def _load() -> dict:
    global _CACHE
    if _CACHE is not None:
        return _CACHE
    DATA.parent.mkdir(parents=True, exist_ok=True)
    if DATA.exists():
        try:
            raw = json.loads(DATA.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            raw = {}
        if isinstance(raw, dict):
            base = _empty()
            for key in base:
                if key in raw:
                    if isinstance(base[key], dict) and isinstance(raw[key], dict):
                        base[key].update(raw[key])
                    else:
                        base[key] = raw[key]
            _CACHE = base
            return _CACHE
    _CACHE = _empty()
    return _CACHE


def _save(data: dict) -> None:
    global _CACHE
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(data, indent=2), encoding="utf-8")
    _CACHE = data


def settings() -> dict:
    with _LOCK:
        return dict(_load()["settings"])


def workflows() -> dict:
    with _LOCK:
        return dict(_load()["workflows"])


def update_settings(patch: dict) -> dict:
    with _LOCK:
        data = _load()
        current = data["settings"]
        if "tone" in patch and str(patch["tone"]) in TONES:
            current["tone"] = str(patch["tone"])
        if "safety" in patch and str(patch["safety"]) in SAFETY_MODES:
            current["safety"] = str(patch["safety"])
        if "assistant_mode" in patch and str(patch["assistant_mode"]) in ASSISTANT_MODES:
            current["assistant_mode"] = str(patch["assistant_mode"])
        if "language" in patch and str(patch["language"]).strip():
            current["language"] = str(patch["language"]).strip()
        if "model" in patch and str(patch["model"]).strip():
            current["model"] = str(patch["model"]).strip()
        if "creativity" in patch:
            try:
                current["creativity"] = max(0, min(100, int(patch["creativity"])))
            except (TypeError, ValueError):
                pass
        _save(data)
        return dict(current)


def update_workflows(patch: dict) -> dict:
    with _LOCK:
        data = _load()
        current = data["workflows"]
        for key in ("auto_responses", "smart_routing", "lead_capture", "follow_up"):
            if key in patch:
                current[key] = bool(patch[key])
        _save(data)
        return dict(current)


def temperature() -> float:
    creativity = settings().get("creativity", 35)
    try:
        value = int(creativity)
    except (TypeError, ValueError):
        value = 35
    return round(0.1 + (max(0, min(100, value)) / 100) * 0.8, 2)


def desk_system_note() -> str:
    s = settings()
    tone = s.get("tone") or "professional"
    safety = s.get("safety") or "strict"
    mode = s.get("assistant_mode") or "product_support"
    extra = {
        "professional": "Keep replies crisp and business-like.",
        "warm": "Keep replies warm and neighbourly, still brief.",
        "brief": "Answer in one or two short sentences.",
    }.get(tone, "")
    if safety == "strict":
        extra += (
            " Do not give medical, legal, or financial advice. "
            "Offer a human handoff instead of guessing."
        )
    mode_line = {
        "product_support": "You are the product support assistant for this business.",
        "sales": "You help with quotes and bookings. Confirm before sending mail.",
        "general": "You are Lentswe, the company voice.",
    }.get(mode, "")
    return f"{mode_line} Tone: {tone}. {extra}".strip()


def log_turn(
    user_text: str,
    reply: str,
    *,
    conversation_id: str = "",
    sources: list | None = None,
    kind: str = "",
) -> None:
    text = (reply or "").lower()
    if not kind:
        if sources:
            kind = "grounded"
        elif "will not invent" in text or "do not have that" in text:
            kind = "unknown"
        elif "handed this to staff" in text or "handoff" in text:
            kind = "handoff"
        else:
            kind = "chat"
    with _LOCK:
        data = _load()
        data["logs"].append(
            {
                "at": _iso(),
                "conversation_id": conversation_id,
                "kind": kind,
                "user": (user_text or "")[:240],
                "reply": (reply or "")[:240],
                "sources": [row.get("file") for row in (sources or []) if row.get("file")],
            }
        )
        data["logs"] = data["logs"][-400:]
        _save(data)


def _week_bounds() -> tuple[datetime, datetime]:
    now = _now()
    start = now - timedelta(days=7)
    prev = start - timedelta(days=7)
    return prev, start


def analytics() -> dict:
    with _LOCK:
        logs = list(_load().get("logs") or [])
    now = _now()
    prev, week_start = _week_bounds()
    this_week = []
    last_week = []
    spark = [0] * 7
    for row in logs:
        try:
            at = datetime.fromisoformat(str(row.get("at") or ""))
        except ValueError:
            continue
        if at.tzinfo is None:
            at = at.replace(tzinfo=timezone.utc)
        if at >= week_start:
            this_week.append(row)
            idx = min(6, max(0, (now.date() - at.date()).days))
            spark[6 - idx] += 1
        elif at >= prev:
            last_week.append(row)
    honest = sum(1 for row in this_week if row.get("kind") in {"grounded", "unknown", "taught"})
    turns = len(this_week)
    last_turns = len(last_week) or 1
    accuracy = round((honest / turns) * 100, 1) if turns else 100.0
    delta = round(((turns - len(last_week)) / last_turns) * 100, 1)
    return {
        "turns_this_week": turns,
        "turns_last_week": len(last_week),
        "accuracy": accuracy,
        "delta": delta,
        "spark": spark,
        "grounded": sum(1 for row in this_week if row.get("kind") == "grounded"),
        "unknown": sum(1 for row in this_week if row.get("kind") == "unknown"),
        "leads": len(list_leads()),
        "bookings": len(list_bookings()),
        "handoffs": len(list_handoffs()),
        "spend_zar": 0,
        "spend_note": "Groq spend is not metered here yet. Tokens do not leave this computer unless a key is set.",
    }


def capture_lead(
    name: str,
    phone: str = "",
    email: str = "",
    note: str = "",
    conversation_id: str = "",
) -> dict:
    item = {
        "id": _id(),
        "name": (name or "").strip(),
        "phone": (phone or "").strip(),
        "email": (email or "").strip(),
        "note": (note or "").strip(),
        "conversation_id": conversation_id,
        "created_at": _iso(),
    }
    if not item["name"]:
        raise ValueError("Need a name for the lead.")
    with _LOCK:
        data = _load()
        data["leads"].insert(0, item)
        _save(data)
    return item


def list_leads() -> list[dict]:
    with _LOCK:
        return list(_load().get("leads") or [])


def book_slot(name: str, slot: str = "", day: str = "") -> dict:
    when = " ".join(part for part in (day, slot) if part).strip() or next_slots()[0]["label"]
    item = {
        "id": _id(),
        "name": (name or "").strip(),
        "slot": when,
        "created_at": _iso(),
        "status": "held",
    }
    if not item["name"]:
        raise ValueError("Need a name for the booking.")
    with _LOCK:
        data = _load()
        data["bookings"].insert(0, item)
        _save(data)
    return item


def list_bookings() -> list[dict]:
    with _LOCK:
        return list(_load().get("bookings") or [])


def next_slots(count: int = 8) -> list[dict]:
    now = _now()
    slots = []
    hours = (9, 11, 14, 16)
    day = now
    while len(slots) < count:
        if day.weekday() < 5:
            for hour in hours:
                stamp = day.replace(hour=hour, minute=0, second=0, microsecond=0)
                if stamp <= now:
                    continue
                slots.append(
                    {
                        "iso": stamp.isoformat(timespec="minutes"),
                        "label": stamp.strftime("%A %H:%M"),
                    }
                )
                if len(slots) >= count:
                    break
        day = day + timedelta(days=1)
        day = day.replace(hour=0, minute=0, second=0, microsecond=0)
    return slots


def handoff(reason: str, conversation_id: str = "") -> dict:
    item = {
        "id": _id(),
        "reason": (reason or "Customer asked for a human.").strip(),
        "conversation_id": conversation_id,
        "created_at": _iso(),
        "status": "open",
    }
    with _LOCK:
        data = _load()
        data["handoffs"].insert(0, item)
        _save(data)
    return item


def list_handoffs() -> list[dict]:
    with _LOCK:
        return list(_load().get("handoffs") or [])


def should_handoff(user_text: str, reply: str = "") -> bool:
    if not workflows().get("smart_routing", True):
        return False
    text = f"{user_text} {reply}".lower()
    cues = (
        "lawyer",
        "attorney",
        "sue",
        "refund now",
        "this is illegal",
        "angry",
        "useless",
        "speak to the manager",
        "talk to a human",
        "medical advice",
        "prescribe",
        "invest my",
        "loan me",
    )
    return any(cue in text for cue in cues)


def draft_quote(query: str) -> dict:
    from src.rag import extract_text, list_source_files

    hits = retrieve(query or "price list")
    needles = [tok for tok in re.findall(r"[a-z0-9]+", (query or "").lower()) if len(tok) > 2]
    blobs = [(hit.source, hit.text) for hit in hits]
    for path in list_source_files():
        blobs.append((path.name, extract_text(path)))
    lines = []
    seen = set()
    for source, text in blobs:
        for raw in re.findall(r"(?i)[-*]?\s*([A-Za-z][^:\n]{2,80}):\s*(R\s?\d+(?:\.\d{2})?)", text or ""):
            item_name = raw[0].strip()
            price = raw[1].replace(" ", "")
            if needles and not any(tok in item_name.lower() for tok in needles):
                continue
            key = (item_name.lower(), price, source)
            if key in seen:
                continue
            seen.add(key)
            lines.append({"item": item_name, "price": price, "source": source})
    if not lines:
        raise ValueError("No matching price in the business documents. I will not invent a quote.")
    item = {
        "id": _id(),
        "query": query.strip(),
        "lines": lines[:6],
        "status": "draft",
        "created_at": _iso(),
    }
    with _LOCK:
        data = _load()
        data["quotes"].insert(0, item)
        _save(data)
    return item


def list_quotes() -> list[dict]:
    with _LOCK:
        return list(_load().get("quotes") or [])


def draft_followup(to_addr: str, body: str, subject: str = "Follow-up from Lentswe") -> dict:
    item = {
        "id": _id(),
        "to": (to_addr or "").strip(),
        "body": (body or "").strip(),
        "subject": subject,
        "status": "draft",
        "created_at": _iso(),
    }
    if "@" not in item["to"] or not item["body"]:
        raise ValueError("Need an email address and a message.")
    with _LOCK:
        data = _load()
        data["followups"].insert(0, item)
        _save(data)
    return item


def confirm_followup(followup_id: str = "") -> dict:
    with _LOCK:
        data = _load()
        rows = data.get("followups") or []
        item = None
        if followup_id:
            item = next((row for row in rows if row.get("id") == followup_id), None)
        elif rows:
            item = rows[0]
        if not item:
            raise ValueError("No follow-up draft to send.")
        if item.get("status") == "sent":
            return item
    result = send_email(item["to"], item["body"], item.get("subject") or "Follow-up from Lentswe")
    sent = result.startswith("I sent")
    item["status"] = "sent" if sent else "blocked"
    item["result"] = result
    with _LOCK:
        data = _load()
        for row in data.get("followups") or []:
            if row.get("id") == item["id"]:
                row.update(item)
        _save(data)
    return item


def list_followups() -> list[dict]:
    with _LOCK:
        return list(_load().get("followups") or [])


def translate_phrase(text: str, language: str) -> dict:
    needle = (text or "").strip().lower()
    lang = (language or "english").strip().lower().replace(" ", "")
    aliases = {
        "isizulu": "zulu",
        "isixhosa": "xhosa",
        "siswati": "swati",
        "tshivenda": "venda",
        "isindebele": "ndebele",
        "xitsonga": "tsonga",
    }
    lang = aliases.get(lang, lang)
    book = PHRASES.get(needle)
    if book and lang in book:
        return {"text": text, "language": lang, "translation": book[lang], "source": "phrase book"}
    if needle in PHRASES.get("hello", {}) or not book:
        for key, table in PHRASES.items():
            if needle == key or needle in table.values():
                if lang in table:
                    return {"text": text, "language": lang, "translation": table[lang], "source": "phrase book"}
    raise ValueError(
        "I only translate the phrase book so far (hello, thank you, how can I help). "
        "I will not invent a translation."
    )


def make_card(title: str, body: str = "", ratio: str = "1:1") -> dict:
    width, height = RATIOS.get(ratio, RATIOS["1:1"])
    headline = escape((title or "Lentswe").strip()[:80])
    blurb = escape((body or "South African voice for your business.").strip()[:160])
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4a6b5c"/>
      <stop offset="100%" stop-color="#c48b8a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="28" fill="url(#g)"/>
  <circle cx="{width * 0.18:.0f}" cy="{height * 0.22:.0f}" r="28" fill="#f3f0ea"/>
  <text x="8%" y="52%" fill="#faf8f4" font-size="28" font-family="Georgia, serif">{headline}</text>
  <text x="8%" y="64%" fill="#f3f0ea" font-size="16" font-family="sans-serif">{blurb}</text>
  <text x="8%" y="90%" fill="#f3f0ea" font-size="12" font-family="sans-serif">Lentswe · local card, no image cloud</text>
</svg>
"""
    item = {
        "id": _id(),
        "title": title.strip(),
        "body": body.strip(),
        "ratio": ratio,
        "svg": svg,
        "created_at": _iso(),
    }
    with _LOCK:
        data = _load()
        data["cards"].insert(0, item)
        data["cards"] = data["cards"][:20]
        _save(data)
    return item


def login(username: str, pin: str) -> dict:
    with _LOCK:
        staff = _load().get("staff") or {}
    user = (username or "").strip()
    code = (pin or "").strip()
    if user == staff.get("username") and code == staff.get("pin"):
        return {"ok": True, "role": "staff", "username": user}
    if user.lower() in {"guest", "customer"} or (not user and not code):
        return {"ok": True, "role": "guest", "username": "guest"}
    return {"ok": False, "detail": "Wrong staff pin. Guest can still chat."}


def integrations() -> list[dict]:
    slack = bool((os.getenv("SLACK_WEBHOOK") or "").strip())
    whatsapp = bool((os.getenv("WHATSAPP_TOKEN") or "").strip())
    origin = (os.getenv("LENTSWE_PUBLIC_URL") or "http://127.0.0.1:7000").rstrip("/")
    snippet = (
        f'<script src="{origin}/embed.js" data-lentswe-embed="1"></script>'
        f'<div id="lentswe-widget"></div>'
    )
    return [
        {
            "id": "website",
            "name": "Website embed",
            "ready": True,
            "how": "Paste the snippet before </body>. Same FastAPI brain, guest chat only.",
            "snippet": snippet,
        },
        {
            "id": "wordpress",
            "name": "WordPress",
            "ready": True,
            "how": "Custom HTML block with the same snippet. No plugin marketplace yet.",
            "snippet": snippet,
        },
        {
            "id": "shopify",
            "name": "Shopify",
            "ready": True,
            "how": "Theme footer: paste the snippet. Product answers still come from Docs.",
            "snippet": snippet,
        },
        {
            "id": "slack",
            "name": "Slack",
            "ready": slack,
            "how": "Incoming webhook only. Set SLACK_WEBHOOK in .env. I will not pretend a channel is live.",
            "blocked": [] if slack else ["SLACK_WEBHOOK"],
        },
        {
            "id": "whatsapp",
            "name": "WhatsApp",
            "ready": whatsapp,
            "how": "SA clients live here. Same brain, new door. Needs WHATSAPP_TOKEN. Browser stays for you.",
            "blocked": [] if whatsapp else ["WHATSAPP_TOKEN"],
        },
    ]


def trust_badges() -> list[dict]:
    return [
        {
            "id": "local",
            "label": "On this computer",
            "detail": "Chats, leads, and docs stay in data/ and docs/business/. Not a SOC 2 audit.",
        },
        {
            "id": "https",
            "label": "HTTPS when you host",
            "detail": "Local http://127.0.0.1 is fine for you. Public host should terminate TLS.",
        },
        {
            "id": "confirm",
            "label": "Confirm before send",
            "detail": "Follow-up mail waits for an explicit confirm. I will not invent a successful send.",
        },
    ]


def public_status() -> dict:
    stats = analytics()
    return {
        "headline": "Intelligent conversation. Smarter business.",
        "pills": ["Smart responses", "Context aware", "Secure on this computer"],
        "settings": settings(),
        "workflows": workflows(),
        "analytics": stats,
        "integrations": integrations(),
        "trust": trust_badges(),
        "slots": next_slots(),
        "leads": list_leads()[:12],
        "bookings": list_bookings()[:12],
        "handoffs": list_handoffs()[:12],
        "followups": list_followups()[:8],
        "quotes": list_quotes()[:8],
        "tutorial": [
            "Open Desk, then Inbox — each chat has its own memory.",
            "Drop a price list in Docs. Ask for a bunny chow price.",
            "Capture a lead or hold a booking slot. Mail waits for confirm.",
        ],
        "examples": [
            {"label": "Mutton bunny chow price", "ask": "how much is the mutton bunny chow?"},
            {"label": "Capture a lead", "ask": "capture lead Thandi 0821112233 thandi@example.com wants catering"},
            {"label": "Draft a quote", "ask": "quote a catering platter"},
            {"label": "Translate hello", "ask": "translate hello to isiZulu"},
        ],
        "widget_path": "/widget",
        "embed_path": "/embed.js",
    }


def is_desk_query(user_text: str) -> bool:
    text = (user_text or "").lower()
    return any(cue in text for cue in _DESK_CUES)


def spoken_help(user_text: str) -> str:
    text = (user_text or "").lower()
    if "file type" in text or "upload" in text:
        return (
            "Docs take .md, .txt, .pdf, and .docx. Drag a file onto Desk or use Add file. "
            "I cite the filename and will not invent a price."
        )
    if "embed" in text or "wordpress" in text or "shopify" in text:
        origin = (os.getenv("LENTSWE_PUBLIC_URL") or "http://127.0.0.1:7000").rstrip("/")
        return (
            f"Website embed lives at {origin}/embed.js. Paste the snippet from the Desk Connect tab "
            "into WordPress, Shopify, or your footer. Slack and WhatsApp stay blocked until you set keys."
        )
    if "integration" in text or "slack" in text:
        return (
            "Connect tab: website, WordPress, and Shopify use the same snippet. "
            "Slack needs SLACK_WEBHOOK. WhatsApp needs WHATSAPP_TOKEN. I will not pretend those are live."
        )
    if "tutorial" in text or "example" in text:
        return (
            "Try this: ask the bunny chow price, then capture lead Thandi, then quote a catering platter. "
            "Teach and Docs still win for trained replies and files."
        )
    if "routing" in text or "handoff" in text or "lead" in text or "follow" in text:
        return (
            "Flows: taught replies are auto-responses. Smart routing hands angry or legal chats to you. "
            "Lead capture stores a name. Follow-up mail waits for confirm."
        )
    stats = analytics()
    return (
        f"Desk is on. Accuracy this week {stats['accuracy']}% on {stats['turns_this_week']} turns "
        f"({stats['delta']:+g}% vs last week). Open Desk for performance, inbox, flows, and connect."
    )


def try_desk_action(user_text: str, conversation_id: str = "") -> str | None:
    text = (user_text or "").strip()
    if not text:
        return None
    if _CONFIRM_FOLLOW.search(text):
        try:
            item = confirm_followup()
        except ValueError as exc:
            return str(exc)
        return item.get("result") or f"Follow-up {item['status']} for {item.get('to')}."
    match = _FOLLOW.search(text)
    if match:
        item = draft_followup(match.group(1).strip("<>,"), match.group(2).strip())
        return (
            f"Draft follow-up to {item['to']} is waiting. "
            "Say “send the follow-up” if you want me to use SMTP. I have not sent it yet."
        )
    match = _LEAD.search(text)
    if match:
        item = capture_lead(
            match.group(1),
            phone=match.group(2) or "",
            email=match.group(3) or "",
            note=(match.group(4) or "").strip(),
            conversation_id=conversation_id,
        )
        return (
            f"Captured lead {item['name']}"
            + (f" · {item['phone']}" if item["phone"] else "")
            + (f" · {item['email']}" if item["email"] else "")
            + ". Saved on this computer."
        )
    match = _BOOK.search(text)
    if match:
        item = book_slot(match.group(1), slot=match.group(2) or "", day=match.group(3) or "")
        return f"Held a booking for {item['name']} at {item['slot']}. Not a paid calendar yet."
    if _HANDOFF.search(text):
        item = handoff(text, conversation_id=conversation_id)
        return (
            f"I handed this to staff ({item['id']}). "
            "I will not guess on legal, medical, or money questions."
        )
    match = _QUOTE.search(text)
    if match and not text.lower().startswith("quote me on"):
        try:
            item = draft_quote(match.group(1))
        except ValueError as exc:
            return str(exc)
        bits = ", ".join(f"{row['item']} {row['price']}" for row in item["lines"][:3])
        source = item["lines"][0].get("source") or "docs"
        return f"Draft quote: {bits}. Source: {source}. I have not sent this to anyone."
    match = _TRANSLATE.search(text)
    if match:
        try:
            item = translate_phrase(match.group(1), match.group(2))
        except ValueError as exc:
            return str(exc)
        return f"{item['translation']} ({item['language']}, {item['source']})."
    match = _CARD.search(text)
    if match:
        item = make_card(match.group(1), body="Made on this computer. No image cloud.")
        return (
            f"Made a branded card for “{item['title']}”. "
            f"Open Desk → Studio or /api/cards/{item['id']}.svg — I did not call an image API."
        )
    if is_desk_query(text):
        return spoken_help(text)
    return None


def card_svg(card_id: str) -> str | None:
    with _LOCK:
        for row in _load().get("cards") or []:
            if row.get("id") == card_id:
                return str(row.get("svg") or "")
    return None


def embed_script(origin: str) -> str:
    base = (origin or "http://127.0.0.1:7000").rstrip("/")
    widget = f"{base}/widget"
    return (
        "(function(){"
        "var d=document.getElementById('lentswe-widget');"
        "if(!d){d=document.createElement('div');d.id='lentswe-widget';document.body.appendChild(d);}"
        "if(d.getAttribute('data-mounted'))return;"
        "d.setAttribute('data-mounted','1');"
        "var f=document.createElement('iframe');"
        f"f.src={json.dumps(widget)};"
        "f.title='Lentswe';"
        "f.style.cssText='position:fixed;right:16px;bottom:16px;width:360px;height:520px;"
        "border:0;border-radius:18px;box-shadow:0 12px 40px rgba(44,50,46,.25);z-index:9999;';"
        "d.appendChild(f);"
        "})();"
    )
