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
    public_payload,
    snapshot,
)
from src.deploy import pack as pack_platform
from src.deploy import public_status
from src.geo import geocode_place
from src.languages import public_language_list
from src.stt import transcribe_wav
from src.knowledge import entries as knowledge_entries
from src.knowledge import forget as forget_knowledge
from src.knowledge import teach as teach_knowledge
from src.service import chat_payload
from src.store import load as load_memory
from src.tts import speak

STATIC = ROOT / "static"

app = Flask(__name__, static_folder=str(STATIC), static_url_path="/static")


@app.get("/")
def home():
    return send_from_directory(STATIC, "index.html")


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


@app.post("/api/conversations")
def create_conversation():
    conv = get_or_create(None)
    return jsonify(public_payload(conv)), 201


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
