"""Easy Streamlit UI for Lentswe — calls FastAPI, same brain as the main page."""

from __future__ import annotations

import os
from pathlib import Path

import httpx
import streamlit as st
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env", override=True)

API_URL = (os.getenv("LENTSWE_API_URL") or "http://127.0.0.1:8000").rstrip("/")

st.set_page_config(page_title="Lentswe · Easy UI", page_icon="🌿", layout="centered")

st.markdown(
    """
    <style>
      .stApp { background: #eeeae3; color: #2c322e; }
      h1 { font-family: Georgia, serif; }
    </style>
    """,
    unsafe_allow_html=True,
)


def _new_id() -> str:
    try:
        res = httpx.post(f"{API_URL}/api/conversations", timeout=8.0)
        res.raise_for_status()
        return str(res.json().get("conversation_id") or "")
    except Exception:
        from src.conversations import get_or_create

        return get_or_create(None).conversation_id


def _ask(text: str, conversation_id: str, history: list[dict]) -> tuple[str, str]:
    try:
        res = httpx.post(
            f"{API_URL}/api/chat",
            json={
                "text": text,
                "language": "english",
                "history": history,
                "conversation_id": conversation_id,
            },
            timeout=60.0,
        )
        res.raise_for_status()
        data = res.json()
        return str(data.get("reply") or ""), str(data.get("conversation_id") or conversation_id)
    except Exception:
        from src.brain import think

        reply = think(text, "english", history, conversation_id=conversation_id or None)
        return reply, conversation_id


if "conversation_id" not in st.session_state:
    st.session_state.conversation_id = _new_id()
if "messages" not in st.session_state:
    st.session_state.messages = []

st.title("Lentswe")
st.caption("Easy Streamlit UI · talks to FastAPI `/api/chat` (local brain if the API is down).")

left, right = st.columns(2)
with left:
    if st.button("New chat"):
        try:
            httpx.post(
                f"{API_URL}/api/conversations/{st.session_state.conversation_id}/end",
                timeout=8.0,
            )
        except Exception:
            from src.conversations import end_conversation

            end_conversation(st.session_state.conversation_id)
        st.session_state.conversation_id = _new_id()
        st.session_state.messages = []
        st.rerun()
with right:
    st.caption("session `" + (st.session_state.conversation_id or "local") + "`")

for turn in st.session_state.messages:
    with st.chat_message(turn["role"]):
        st.write(turn["content"])

prompt = st.chat_input("Type to Lentswe…")
if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)
    history = [m for m in st.session_state.messages if m["role"] in {"user", "assistant"}][:-1]
    reply, cid = _ask(prompt, st.session_state.conversation_id, history)
    if cid:
        st.session_state.conversation_id = cid
    st.session_state.messages.append({"role": "assistant", "content": reply})
    with st.chat_message("assistant"):
        st.write(reply)

st.divider()
st.markdown(
    "Pack this UI with **Docker** (`docker compose up --build`) or host the site on **Vercel**. "
    "The full Lentswe page is still `python app.py` on port 7000."
)
