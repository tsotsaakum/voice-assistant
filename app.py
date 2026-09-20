from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, redirect, request, send_from_directory

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env", override=True)

from src.chat import chat_model, openai_enabled
from src.conversations import (
    append_message,
    end_conversation,
    get_or_create,
    list_conversations,
    public_payload,
    share_text,
    snapshot,
)
from src.desk import (
    book_slot,
    capture_lead,
    card_svg,
    confirm_followup,
    draft_followup,
    draft_quote,
    embed_script,
    handoff,
    login as desk_login,
    make_card,
    next_slots,
    public_status as desk_public_status,
    translate_phrase,
    update_settings,
    update_workflows,
)
from src.deploy import pack as pack_platform
from src.deploy import public_status
from src.geo import geocode_place
from src.languages import public_language_list
from src.stt import transcribe_wav
from src.knowledge import entries as knowledge_entries
from src.knowledge import forget as forget_knowledge
from src.knowledge import teach as teach_knowledge
from src.rag import build_index as rebuild_docs
from src.rag import public_status as docs_public_status
from src.rag import save_upload as save_doc_upload
from src.service import chat_payload
from src.store import load as load_memory
from src.tts import speak

STATIC = ROOT / "static"

app = Flask(__name__, static_folder=str(STATIC), static_url_path="/static")


@app.get("/")
def home():
    return send_from_directory(STATIC, "index.html")


@app.get("/widget")
def widget():
    return send_from_directory(STATIC, "widget.html")


@app.get("/embed.js")
def embed_js():
    origin = request.host_url.rstrip("/")
    return Response(embed_script(origin), mimetype="application/javascript")


@app.get("/api/languages")
def languages():
    return jsonify({"languages": public_language_list()})


@app.get("/api/memory")
def memory():
    return jsonify(load_memory())


@app.get("/api/knowledge")
def knowledge():
    return jsonify({"questions": knowledge_entries()})


@app.post("/api/knowledge")
def add_knowledge():
    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()
    answer = (body.get("answer") or "").strip()
    if not question or not answer:
        return jsonify({"detail": "Need both a question and an answer."}), 400
    item = teach_knowledge(question, answer)
    return jsonify(item), 201


@app.delete("/api/knowledge/<entry_id>")
def remove_knowledge(entry_id: str):
    if not forget_knowledge(entry_id):
        return jsonify({"detail": "No taught reply with that id."}), 404
    return jsonify({"ok": True})


@app.get("/api/status")
def status():
    return jsonify({"groq": openai_enabled(), "model": chat_model()})


@app.get("/api/docs")
def docs_status():
    return jsonify(docs_public_status())


@app.post("/api/docs/reindex")
def docs_reindex():
    rebuild_docs()
    return jsonify(docs_public_status())


@app.post("/api/docs/upload")
def docs_upload():
    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify({"detail": "Need a .md, .txt, .pdf, or .docx file with content."}), 400
    saved = save_doc_upload(uploaded.filename or "", uploaded.read())
    if not saved:
        return jsonify({"detail": "Need a .md, .txt, .pdf, or .docx file with content."}), 400
    return jsonify(saved)


@app.get("/api/deploy")
def deploy_status():
    return jsonify(public_status())


@app.post("/api/deploy/<platform_id>")
def deploy_pack(platform_id: str):
    result = pack_platform(platform_id)
    if not result.get("ok") and result.get("detail") == "Unknown platform.":
        return jsonify(result), 404
    return jsonify(result)


@app.get("/api/reminders/due")
def reminders_due():
    from src.store import due_reminders

    return jsonify({"reminders": due_reminders()})


@app.get("/api/geocode")
def geocode():
    place = (request.args.get("q") or "").strip()
    if not place:
        return jsonify({"detail": "Save a home address first."}), 400
    try:
        hit = geocode_place(place)
    except Exception:
        return jsonify({"detail": "Map lookup is down. Try again in a minute."}), 503
    if not hit:
        return jsonify({"detail": "OpenStreetMap could not pin that address."}), 404
    return jsonify(hit)


@app.get("/api/chat")
@app.get("/api/talk")
@app.get("/api/speak")
def api_use_the_app():
    """Browsers send GET; these routes only work as POST from the Lentswe page."""
    return redirect("/")


@app.post("/api/talk")
def talk():
    audio = request.files.get("audio")
    if not audio:
        return jsonify({"detail": "No audio received"}), 400

    language = request.form.get("language", "auto")
    history_json = request.form.get("history_json", "[]")
    wav_bytes = audio.read()
    if not wav_bytes:
        return jsonify({"detail": "No audio received"}), 400

    try:
        text, lang = transcribe_wav(wav_bytes, language)
    except RuntimeError as exc:
        return jsonify({"detail": str(exc)}), 400
    except Exception as exc:
        return jsonify({"detail": f"Speech recognition failed: {exc}"}), 500

    try:
        history = json.loads(history_json)
        if not isinstance(history, list):
            history = []
    except json.JSONDecodeError:
        history = []

    conversation_id = (request.form.get("conversation_id") or "").strip() or None
    payload = _chat_payload(text, lang, history, conversation_id)
    payload["transcript"] = text
    return jsonify(payload)


@app.post("/api/chat")
def chat():
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    language = body.get("language") or "english"
    history = body.get("history") or []
    conversation_id = (body.get("conversation_id") or "").strip() or None
    if not text:
        return jsonify({"detail": "Type a message first"}), 400
    return jsonify(_chat_payload(text, language, history, conversation_id))


@app.get("/api/desk")
def desk_status():
    return jsonify(desk_public_status())


@app.patch("/api/desk/settings")
def desk_settings():
    body = request.get_json(silent=True) or {}
    return jsonify(update_settings(body))


@app.patch("/api/desk/workflows")
def desk_workflows():
    body = request.get_json(silent=True) or {}
    return jsonify(update_workflows(body))


@app.post("/api/auth/login")
def auth_login():
    body = request.get_json(silent=True) or {}
    result = desk_login(body.get("username") or "", body.get("pin") or "")
    if not result.get("ok"):
        return jsonify({"detail": result.get("detail") or "Login failed."}), 401
    return jsonify(result)


@app.get("/api/leads")
def leads_list():
    from src.desk import list_leads

    return jsonify({"leads": list_leads()})


@app.post("/api/leads")
def leads_add():
    body = request.get_json(silent=True) or {}
    try:
        item = capture_lead(
            body.get("name") or "",
            phone=body.get("phone") or "",
            email=body.get("email") or "",
            note=body.get("note") or "",
            conversation_id=body.get("conversation_id") or "",
        )
    except ValueError as exc:
        return jsonify({"detail": str(exc)}), 400
    return jsonify(item), 201


@app.get("/api/bookings")
def bookings_list():
    from src.desk import list_bookings

    return jsonify({"bookings": list_bookings(), "slots": next_slots()})


@app.post("/api/bookings")
def bookings_add():
    body = request.get_json(silent=True) or {}
    try:
        item = book_slot(body.get("name") or "", slot=body.get("slot") or "", day=body.get("day") or "")
    except ValueError as exc:
        return jsonify({"detail": str(exc)}), 400
    return jsonify(item), 201


@app.post("/api/handoff")
def handoff_add():
    body = request.get_json(silent=True) or {}
    return jsonify(handoff(body.get("reason") or "", conversation_id=body.get("conversation_id") or "")), 201


@app.post("/api/quotes")
def quotes_add():
    body = request.get_json(silent=True) or {}
    try:
        item = draft_quote(body.get("query") or body.get("text") or "")
    except ValueError as exc:
        return jsonify({"detail": str(exc)}), 400
    return jsonify(item), 201


@app.post("/api/followups")
def followups_add():
    body = request.get_json(silent=True) or {}
    if body.get("confirm") or body.get("send"):
        try:
            return jsonify(confirm_followup(body.get("id") or ""))
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 400
    try:
        item = draft_followup(body.get("to") or "", body.get("body") or "", body.get("subject") or "Follow-up from Lentswe")
    except ValueError as exc:
        return jsonify({"detail": str(exc)}), 400
    return jsonify(item), 201


@app.post("/api/translate")
def translate_route():
    body = request.get_json(silent=True) or {}
    try:
        return jsonify(translate_phrase(body.get("text") or "", body.get("language") or "zulu"))
    except ValueError as exc:
        return jsonify({"detail": str(exc)}), 400


@app.post("/api/cards")
def cards_add():
    body = request.get_json(silent=True) or {}
    return jsonify(make_card(body.get("title") or "", body=body.get("body") or "", ratio=body.get("ratio") or "1:1")), 201


@app.get("/api/cards/<card_id>.svg")
def cards_svg(card_id: str):
    svg = card_svg(card_id)
    if not svg:
        return jsonify({"detail": "No card with that id."}), 404
    return Response(svg, mimetype="image/svg+xml")


@app.post("/api/conversations")
def create_conversation():
    conv = get_or_create(None)
    return jsonify(public_payload(conv)), 201


@app.get("/api/conversations")
def conversations_index():
    return jsonify({"conversations": list_conversations(request.args.get("q") or "")})


@app.get("/api/conversations/<conversation_id>/share")
def conversation_share(conversation_id: str):
    text = share_text(conversation_id)
    if text is None:
        return jsonify({"detail": "No chat with that id."}), 404
    return jsonify({"text": text, "conversation_id": conversation_id})


@app.get("/api/conversations/<conversation_id>")
def get_conversation(conversation_id: str):
    data = snapshot(conversation_id)
    if not data:
        return jsonify({"detail": "No chat with that id."}), 404
    return jsonify(data)


@app.post("/api/conversations/<conversation_id>/end")
def finish_conversation(conversation_id: str):
    conv = end_conversation(conversation_id)
    if not conv:
        return jsonify({"detail": "No chat with that id."}), 404
    return jsonify(public_payload(conv))


@app.post("/api/conversations/<conversation_id>/turns")
def add_conversation_turn(conversation_id: str):
    body = request.get_json(silent=True) or {}
    role = (body.get("role") or "").strip()
    content = (body.get("content") or "").strip()
    conv = append_message(conversation_id, role, content)
    if not conv:
        return jsonify({"detail": "No active chat with that id."}), 404
    return jsonify(public_payload(conv))


@app.post("/api/speak")
def speak_route():
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    language = body.get("language") or "english"
    if not text:
        return jsonify({"skipped": True})
    audio = speak(text, language)
    if not audio:
        return jsonify({"skipped": True, "reason": "No spoken voice for this language yet; showing text only."})
    mime = "audio/wav" if audio[:4] == b"RIFF" else "audio/mpeg"
    return Response(audio, mimetype=mime)


def _chat_payload(text: str, language: str, history: list, conversation_id: str | None) -> dict:
    return chat_payload(text, language, history, conversation_id)


if __name__ == "__main__":
    host = os.getenv("LENTSWE_HOST") or "127.0.0.1"
    port = int(os.getenv("LENTSWE_PORT") or "7000")
    debug = os.getenv("LENTSWE_DEBUG", "1") != "0"
    app.run(host=host, port=port, debug=debug, load_dotenv=False)
