from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, redirect, request, send_from_directory

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env", override=True)

from src.brain import think
from src.chat import chat_model, openai_enabled
from src.geo import geocode_place
from src.languages import public_language_list
from src.stt import transcribe_wav
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


@app.get("/api/status")
def status():
    return jsonify({"groq": openai_enabled(), "model": chat_model()})


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

    answer = think(text, lang, history)
    return jsonify({"transcript": text, "language": lang, "reply": answer})


@app.post("/api/chat")
def chat():
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    language = body.get("language") or "english"
    history = body.get("history") or []
    if not text:
        return jsonify({"detail": "Type a message first"}), 400
    answer = think(text, language, history)
    return jsonify({"reply": answer, "language": language})


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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=7000, debug=True, load_dotenv=False)
