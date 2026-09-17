"""FastAPI backend APIs for Lentswe (text chat, knowledge, deploy)."""

from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles

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
from src.knowledge import entries as knowledge_entries
from src.knowledge import forget as forget_knowledge
from src.knowledge import teach as teach_knowledge
from src.languages import public_language_list
from src.service import chat_payload
from src.store import load as load_memory
from src.stt import transcribe_wav
from src.tts import speak

STATIC = ROOT / "static"

app = FastAPI(title="Lentswe API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "service": "lentswe", "backend": "fastapi"}


@app.get("/")
def home():
    return FileResponse(STATIC / "index.html")


@app.get("/api/languages")
def languages():
    return {"languages": public_language_list()}


@app.get("/api/memory")
def memory():
    return load_memory()


@app.get("/api/knowledge")
def knowledge():
    return {"questions": knowledge_entries()}


@app.post("/api/knowledge", status_code=201)
async def add_knowledge(request: Request):
    body = await request.json()
    question = str(body.get("question") or "").strip()
    answer = str(body.get("answer") or "").strip()
    if not question or not answer:
        raise HTTPException(status_code=400, detail="Need both a question and an answer.")
    return teach_knowledge(question, answer)


@app.delete("/api/knowledge/{entry_id}")
def remove_knowledge(entry_id: str):
    if not forget_knowledge(entry_id):
        raise HTTPException(status_code=404, detail="No taught reply with that id.")
    return {"ok": True}


@app.get("/api/status")
def status():
    return {"groq": openai_enabled(), "model": chat_model()}


@app.get("/api/deploy")
def deploy_status():
    return public_status()


@app.post("/api/deploy/{platform_id}")
def deploy_pack(platform_id: str):
    result = pack_platform(platform_id)
    if not result.get("ok") and result.get("detail") == "Unknown platform.":
        raise HTTPException(status_code=404, detail=result["detail"])
    return result


@app.get("/api/reminders/due")
def reminders_due():
    from src.store import due_reminders

    return {"reminders": due_reminders()}


@app.get("/api/geocode")
def geocode(q: str = ""):
    place = (q or "").strip()
    if not place:
        raise HTTPException(status_code=400, detail="Save a home address first.")
    try:
        hit = geocode_place(place)
    except Exception:
        raise HTTPException(status_code=503, detail="Map lookup is down. Try again in a minute.")
    if not hit:
        raise HTTPException(status_code=404, detail="OpenStreetMap could not pin that address.")
    return hit


@app.get("/api/chat")
@app.get("/api/talk")
@app.get("/api/speak")
def api_use_the_app():
    return RedirectResponse("/")


@app.post("/api/talk")
async def talk(
    audio: UploadFile | None = File(default=None),
    language: str = Form("auto"),
    history_json: str = Form("[]"),
    conversation_id: str = Form(""),
):
    if audio is None:
        raise HTTPException(status_code=400, detail="No audio received")
    wav_bytes = await audio.read()
    if not wav_bytes:
        raise HTTPException(status_code=400, detail="No audio received")
    try:
        text, lang = transcribe_wav(wav_bytes, language)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Speech recognition failed: {exc}")
    try:
        history = json.loads(history_json)
        if not isinstance(history, list):
            history = []
    except json.JSONDecodeError:
        history = []
    cid = (conversation_id or "").strip() or None
    payload = chat_payload(text, lang, history, cid)
    payload["transcript"] = text
    return payload


@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    text = str(body.get("text") or "").strip()
    language = body.get("language") or "english"
    history = body.get("history") or []
    conversation_id = str(body.get("conversation_id") or "").strip() or None
    if not text:
        raise HTTPException(status_code=400, detail="Type a message first")
    return chat_payload(text, language, history, conversation_id)


@app.post("/api/conversations", status_code=201)
def create_conversation():
    conv = get_or_create(None)
    return public_payload(conv)


@app.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    data = snapshot(conversation_id)
    if not data:
        raise HTTPException(status_code=404, detail="No chat with that id.")
    return data


@app.post("/api/conversations/{conversation_id}/end")
def finish_conversation(conversation_id: str):
    conv = end_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="No chat with that id.")
    return public_payload(conv)


@app.post("/api/conversations/{conversation_id}/turns")
async def add_conversation_turn(conversation_id: str, request: Request):
    body = await request.json()
    role = str(body.get("role") or "").strip()
    content = str(body.get("content") or "").strip()
    conv = append_message(conversation_id, role, content)
    if not conv:
        raise HTTPException(status_code=404, detail="No active chat with that id.")
    return public_payload(conv)


@app.post("/api/speak")
async def speak_route(request: Request):
    body = await request.json()
    text = str(body.get("text") or "").strip()
    language = body.get("language") or "english"
    if not text:
        return {"skipped": True}
    audio = speak(text, language)
    if not audio:
        return {
            "skipped": True,
            "reason": "No spoken voice for this language yet; showing text only.",
        }
    mime = "audio/wav" if audio[:4] == b"RIFF" else "audio/mpeg"
    return Response(content=audio, media_type=mime)


if STATIC.is_dir():
    app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")
