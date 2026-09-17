from pathlib import Path

from src.brain import think
from src.knowledge import TEACH_PROMPT, teach
from src.rag import (
    UNKNOWN_REPLY,
    build_index,
    configure,
    extract_text,
    grounded_reply,
    last_sources,
    looks_like_business_fact,
    public_status,
    retrieve,
    save_upload,
)


ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "docs" / "business"


def _seed_sample(tmp_path: Path) -> None:
    dest = tmp_path / "business"
    dest.mkdir(parents=True, exist_ok=True)
    for name in ("price-list.md", "hours-and-policy.md", "staff-faq.txt"):
        (dest / name).write_text((SAMPLE / name).read_text(encoding="utf-8"), encoding="utf-8")
    configure(dest, tmp_path / "rag_index.json")
    build_index()


def test_looks_like_business_fact():
    assert looks_like_business_fact("how much is the mutton bunny chow?")
    assert looks_like_business_fact("what's the refund policy for catering?")
    assert looks_like_business_fact("how much is a Tesla?")
    assert not looks_like_business_fact("how much time do I have?")
    assert not looks_like_business_fact("hello")


def test_retrieve_price_cites_price_list(tmp_path):
    _seed_sample(tmp_path)
    hits = retrieve("how much is the mutton bunny chow?")
    assert hits
    assert hits[0].source == "price-list.md"
    assert "R85" in hits[0].text
    reply = grounded_reply(hits)
    assert "R85" in reply
    assert "price-list.md" in reply


def test_retrieve_refund_policy(tmp_path):
    _seed_sample(tmp_path)
    hits = retrieve("what's the refund policy for catering?")
    assert hits
    assert hits[0].source == "hours-and-policy.md"
    assert "48 hours" in hits[0].text


def test_retrieve_guest_wifi(tmp_path):
    _seed_sample(tmp_path)
    hits = retrieve("what is the guest wifi password?")
    assert hits
    assert hits[0].source == "staff-faq.txt"
    assert "guest-lentswe" in hits[0].text


def test_think_quotes_price_without_groq(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    _seed_sample(tmp_path)
    reply = think("how much is the mutton bunny chow?", "english", conversation_id="docs-1")
    assert "R85" in reply
    assert "price-list.md" in reply
    assert last_sources()
    assert last_sources()[0]["file"] == "price-list.md"


def test_unknown_price_does_not_invent_or_call_groq(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: True)
    called = []

    def fake_reply(*args, **kwargs):
        called.append(kwargs)
        return "A Tesla is R1 200 000."

    monkeypatch.setattr("src.brain.reply", fake_reply)
    _seed_sample(tmp_path)
    reply = think("how much is a Tesla?", "english", conversation_id="docs-tesla")
    assert reply == UNKNOWN_REPLY
    assert "R" not in reply or "invent" in reply.lower()
    assert "1 200" not in reply
    assert called == []
    assert reply == UNKNOWN_REPLY


def test_known_price_passes_chunks_to_groq(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: True)
    captured = {}

    def fake_reply(user_text, language_id, history, retrieved=None):
        captured["retrieved"] = retrieved
        return "Mutton bunny chow is R85. Source: price-list.md"

    monkeypatch.setattr("src.brain.reply", fake_reply)
    _seed_sample(tmp_path)
    reply = think("how much is the mutton bunny chow?", "english", conversation_id="docs-groq")
    assert captured.get("retrieved")
    assert any("R85" in hit.text for hit in captured["retrieved"])
    assert "price-list.md" in reply


def test_taught_reply_still_wins_over_docs(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    _seed_sample(tmp_path)
    teach("how much is the mutton bunny chow?", "ask the till")
    reply = think("how much is the mutton bunny chow?", "english", conversation_id="teach-wins")
    assert reply == "ask the till"


def test_canteen_special_still_asks_to_be_taught(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    _seed_sample(tmp_path)
    first = think("what's the canteen special?", "english", conversation_id="canteen")
    assert first == TEACH_PROMPT


def test_memory_still_isolated_with_docs(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    _seed_sample(tmp_path)
    think("my name is Akum", "english", conversation_id="named")
    isolated = think("what is my name?", "english", conversation_id="fresh")
    assert "Akum" not in isolated


def test_pdf_chunks_are_retrievable(tmp_path):
    dest = tmp_path / "business"
    dest.mkdir(parents=True, exist_ok=True)
    pdf_path = dest / "deposit.pdf"
    pdf_path.write_bytes(_text_pdf("The catering deposit is R200 and is part of the platter price."))
    configure(dest, tmp_path / "rag_index.json")
    assert "R200" in extract_text(pdf_path)
    hits = retrieve("what is the catering deposit?")
    assert hits
    assert hits[0].source == "deposit.pdf"
    assert "R200" in hits[0].text


def test_public_status_and_upload(tmp_path):
    dest = tmp_path / "business"
    dest.mkdir(parents=True, exist_ok=True)
    configure(dest, tmp_path / "rag_index.json")
    saved = save_upload("note.md", b"Delivery is only inside eThekwini.")
    assert saved and saved["name"] == "note.md"
    status = public_status()
    assert status["file_count"] == 1
    assert status["cloud_key"] is False
    hits = retrieve("where do you deliver?")
    assert hits
    assert "eThekwini" in hits[0].text


def _text_pdf(text: str) -> bytes:
    safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 12 Tf 40 700 Td ({safe}) Tj ET\n".encode("latin-1")
    objects = [
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n",
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n",
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n",
        b"4 0 obj<</Length %d>>stream\n" % len(stream) + stream + b"endstream\nendobj\n",
        b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n",
    ]
    header = b"%PDF-1.1\n"
    body = b"".join(objects)
    offsets = []
    cursor = len(header)
    for obj in objects:
        offsets.append(cursor)
        cursor += len(obj)
    xref = b"xref\n0 6\n0000000000 65535 f \n"
    for offset in offsets:
        xref += f"{offset:010d} 00000 n \n".encode("ascii")
    trailer = (
        b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n"
        + str(len(header) + len(body)).encode("ascii")
        + b"\n%%EOF\n"
    )
    return header + body + xref + trailer
