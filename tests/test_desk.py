import zipfile
from xml.etree.ElementTree import Element, SubElement, tostring

from fastapi.testclient import TestClient

from src.brain import think
from src.desk import (
    book_slot,
    capture_lead,
    confirm_followup,
    draft_followup,
    draft_quote,
    handoff,
    login,
    make_card,
    public_status,
    temperature,
    translate_phrase,
    update_settings,
)
from src.rag import extract_text, save_upload
from tests.test_rag import _seed_sample


def test_settings_and_temperature():
    assert 0.1 <= temperature() <= 0.9
    saved = update_settings({"tone": "warm", "creativity": 80, "safety": "strict"})
    assert saved["tone"] == "warm"
    assert saved["creativity"] == 80
    assert temperature() > 0.6


def test_staff_login_and_guest():
    assert login("staff", "lentswe")["role"] == "staff"
    assert login("guest", "")["role"] == "guest"
    assert login("staff", "nope")["ok"] is False


def test_lead_booking_handoff_and_chat(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    lead = capture_lead("Thandi", phone="0821112233", email="thandi@example.com")
    assert lead["name"] == "Thandi"
    hold = book_slot("Thandi", slot="14:00", day="Thursday")
    assert "Thandi" in hold["slot"] or hold["name"] == "Thandi"
    ticket = handoff("customer asked for a person")
    assert ticket["status"] == "open"
    reply = think(
        "capture lead Sipho 0832223344 sipho@example.com wants catering",
        "english",
        conversation_id="desk-lead",
    )
    assert "Sipho" in reply
    handed = think("hand this to a human", "english", conversation_id="desk-lead")
    assert "handed" in handed.lower()


def test_quote_uses_price_list_not_invention(tmp_path):
    _seed_sample(tmp_path)
    item = draft_quote("catering platter")
    prices = " ".join(row["price"] for row in item["lines"])
    assert "R650" in prices or "650" in prices
    try:
        draft_quote("a Tesla")
        raised = False
    except ValueError as exc:
        raised = True
        assert "invent" in str(exc).lower() or "no matching" in str(exc).lower()
    if not raised:
        raise AssertionError("quote must refuse an unknown price")


def test_followup_waits_for_confirm(monkeypatch):
    draft = draft_followup("test@example.com", "Thanks for the visit")
    assert draft["status"] == "draft"
    sent = confirm_followup(draft["id"])
    assert sent["status"] in {"blocked", "sent"}
    assert "sent" in (sent.get("result") or "").lower() or "did not send" in (sent.get("result") or "").lower()


def test_translate_and_local_card():
    zulu = translate_phrase("hello", "isiZulu")
    assert zulu["translation"] == "Sawubona"
    card = make_card("Tsotsa Kitchen", "Bunny chow from R55")
    assert "<svg" in card["svg"]
    assert "Tsotsa Kitchen" in card["svg"]


def test_docx_upload_indexes(tmp_path):
    from src.rag import configure, retrieve

    configure(tmp_path / "business", tmp_path / "rag_index.json")
    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    document = Element("{%s}document" % ns)
    body = SubElement(document, "{%s}body" % ns)
    para = SubElement(body, "{%s}p" % ns)
    run = SubElement(para, "{%s}r" % ns)
    text = SubElement(run, "{%s}t" % ns)
    text.text = "Staff coffee is free on Fridays."
    xml = tostring(document)
    path = tmp_path / "note.docx"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("word/document.xml", xml)
    assert "coffee" in extract_text(path)
    saved = save_upload("note.docx", path.read_bytes())
    assert saved["name"] == "note.docx"
    hits = retrieve("staff coffee")
    assert hits
    assert "coffee" in hits[0].text.lower()


def test_fastapi_desk_routes(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    _seed_sample(tmp_path)
    client = TestClient(app := __import__("fastapi_app", fromlist=["app"]).app)
    status = client.get("/api/desk")
    assert status.status_code == 200
    body = status.json()
    assert body["headline"].startswith("Intelligent")
    assert {row["id"] for row in body["integrations"]} >= {"website", "wordpress", "shopify", "slack"}
    auth = client.post("/api/auth/login", json={"username": "staff", "pin": "lentswe"})
    assert auth.status_code == 200
    listed = client.get("/api/conversations")
    assert listed.status_code == 200
    cid = client.post("/api/conversations").json()["conversation_id"]
    shared = client.get("/api/conversations/" + cid + "/share")
    assert shared.status_code == 200
    chat = client.post(
        "/api/chat",
        json={"text": "desk status", "language": "english", "conversation_id": cid},
    )
    assert chat.status_code == 200
    assert "desk" in chat.json()["reply"].lower()
    widget = client.get("/widget")
    assert widget.status_code == 200
    embed = client.get("/embed.js")
    assert embed.status_code == 200
    assert "lentswe-widget" in embed.text


def test_desk_status_payload():
    payload = public_status()
    assert "Smart responses" in payload["pills"]
    assert payload["settings"]["safety"] in {"strict", "standard"}
    assert payload["widget_path"] == "/widget"
