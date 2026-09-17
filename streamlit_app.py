"""Easy Streamlit UI for Lentswe — same brain as the main page."""

from __future__ import annotations

from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env", override=True)

from src.brain import think
from src.conversations import end_conversation, get_or_create

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

if "conversation_id" not in st.session_state:
    conv = get_or_create(None)
    st.session_state.conversation_id = conv.conversation_id
if "messages" not in st.session_state:
    st.session_state.messages = []

st.title("Lentswe")
st.caption("Easy Streamlit UI · same voice assistant brain as the full app.")

left, right = st.columns(2)
with left:
    if st.button("New chat"):
        end_conversation(st.session_state.conversation_id)
        conv = get_or_create(None)
        st.session_state.conversation_id = conv.conversation_id
        st.session_state.messages = []
        st.rerun()
with right:
    st.caption("session `" + st.session_state.conversation_id + "`")

for turn in st.session_state.messages:
    with st.chat_message(turn["role"]):
        st.write(turn["content"])

prompt = st.chat_input("Type to Lentswe…")
if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)
    reply = think(
        prompt,
        "english",
        st.session_state.messages,
        conversation_id=st.session_state.conversation_id,
    )
    st.session_state.messages.append({"role": "assistant", "content": reply})
    with st.chat_message("assistant"):
        st.write(reply)

st.divider()
st.markdown(
    "Pack this UI with **Docker** (`docker compose up --build`) or host the API on **Vercel**. "
    "The full Lentswe page is still `python app.py` on port 7000."
)
