from app import app


def test_chat_creates_and_recalls_conversation(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    client = app.test_client()

    created = client.post("/api/conversations")
    assert created.status_code == 201
    cid = created.get_json()["conversation_id"]
    assert cid

    first = client.post(
        "/api/chat",
        json={"text": "my name is Akum", "language": "english", "conversation_id": cid},
    )
    assert first.status_code == 200
    body = first.get_json()
    assert body["conversation_id"] == cid
    assert body["active"] is True
    assert "Akum" in body["reply"]
    assert body["turn_count"] >= 2

    second = client.post(
        "/api/chat",
        json={"text": "what is my name?", "language": "english", "conversation_id": cid},
    )
    assert "Akum" in second.get_json()["reply"]

    restored = client.get("/api/conversations/" + cid)
    assert restored.status_code == 200
    messages = restored.get_json()["messages"]
    assert messages[0]["content"] == "my name is Akum"
    assert any("Akum" in (m.get("content") or "") for m in messages if m["role"] == "assistant")


def test_new_conversation_does_not_see_other_chat(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    client = app.test_client()
    a = client.post("/api/conversations").get_json()["conversation_id"]
    b = client.post("/api/conversations").get_json()["conversation_id"]
    client.post("/api/chat", json={"text": "my name is Akum", "conversation_id": a})
    reply = client.post("/api/chat", json={"text": "what is my name?", "conversation_id": b})
    assert "Akum" not in reply.get_json()["reply"]


def test_ended_conversation_via_api(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    client = app.test_client()
    cid = client.post("/api/conversations").get_json()["conversation_id"]
    ended = client.post("/api/conversations/" + cid + "/end")
    assert ended.status_code == 200
    assert ended.get_json()["active"] is False
    chat = client.post("/api/chat", json={"text": "hello", "conversation_id": cid})
    assert "ended" in chat.get_json()["reply"].lower()
    assert chat.get_json()["active"] is False


def test_knowledge_api_teach_and_chat_recall(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    client = app.test_client()
    created = client.post(
        "/api/knowledge",
        json={"question": "hello", "answer": "hey there"},
    )
    assert created.status_code == 201
    listed = client.get("/api/knowledge")
    questions = listed.get_json()["questions"]
    assert any(q["question"] == "hello" and q["answer"] == "hey there" for q in questions)

    cid = client.post("/api/conversations").get_json()["conversation_id"]
    chat = client.post(
        "/api/chat",
        json={"text": "hello", "language": "english", "conversation_id": cid},
    )
    assert chat.get_json()["reply"] == "hey there"

    entry_id = created.get_json()["id"]
    deleted = client.delete("/api/knowledge/" + entry_id)
    assert deleted.status_code == 200
    empty = client.get("/api/knowledge").get_json()["questions"]
    assert all(q["id"] != entry_id for q in empty)


def test_docs_api_chat_cites_source_and_refuses_unknown(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    from tests.test_rag import _seed_sample

    _seed_sample(tmp_path)
    client = app.test_client()
    listed = client.get("/api/docs")
    assert listed.status_code == 200
    body = listed.get_json()
    assert body["cloud_key"] is False
    names = [row["name"] for row in body["files"]]
    assert "price-list.md" in names

    cid = client.post("/api/conversations").get_json()["conversation_id"]
    chat = client.post(
        "/api/chat",
        json={
            "text": "how much is the mutton bunny chow?",
            "language": "english",
            "conversation_id": cid,
        },
    )
    payload = chat.get_json()
    assert "R85" in payload["reply"]
    assert payload["sources"]
    assert payload["sources"][0]["file"] == "price-list.md"

    unknown = client.post(
        "/api/chat",
        json={"text": "how much is a Tesla?", "conversation_id": cid},
    )
    assert "invent" in unknown.get_json()["reply"].lower()
    assert "Tesla" not in unknown.get_json()["reply"]

    rebuilt = client.post("/api/docs/reindex")
    assert rebuilt.status_code == 200
    assert rebuilt.get_json()["file_count"] >= 3

