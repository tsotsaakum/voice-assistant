from fastapi.testclient import TestClient

from fastapi_app import app


def test_fastapi_health_and_deploy_status():
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["backend"] == "fastapi"
    deploy = client.get("/api/deploy")
    assert deploy.status_code == 200
    body = deploy.json()
    assert [p["id"] for p in body["teach"]] == ["streamlit", "docker", "vercel"]
    assert [p["id"] for p in body["wired"]] == ["fastapi", "aws"]


def test_fastapi_chat_and_knowledge_match_flask(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    client = TestClient(app)
    taught = client.post("/api/knowledge", json={"question": "hello", "answer": "hey there"})
    assert taught.status_code == 201
    cid = client.post("/api/conversations").json()["conversation_id"]
    chat = client.post(
        "/api/chat",
        json={"text": "hello", "language": "english", "conversation_id": cid},
    )
    assert chat.status_code == 200
    assert chat.json()["reply"] == "hey there"
    named = client.post(
        "/api/chat",
        json={"text": "my name is Akum", "language": "english", "conversation_id": cid},
    )
    assert "Akum" in named.json()["reply"]
    fresh = client.post("/api/conversations").json()["conversation_id"]
    other = client.post(
        "/api/chat",
        json={"text": "what is my name?", "conversation_id": fresh},
    )
    assert "Akum" not in other.json()["reply"]


def test_fastapi_docs_retrieve_and_unknown_price(monkeypatch, tmp_path):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    from tests.test_rag import _seed_sample

    _seed_sample(tmp_path)
    client = TestClient(app)
    listed = client.get("/api/docs")
    assert listed.status_code == 200
    assert listed.json()["cloud_key"] is False
    cid = client.post("/api/conversations").json()["conversation_id"]
    chat = client.post(
        "/api/chat",
        json={
            "text": "how much is the mutton bunny chow?",
            "language": "english",
            "conversation_id": cid,
        },
    )
    assert chat.status_code == 200
    body = chat.json()
    assert "R85" in body["reply"]
    assert body["sources"][0]["file"] == "price-list.md"
    unknown = client.post(
        "/api/chat",
        json={"text": "how much is a Tesla?", "conversation_id": cid},
    )
    assert "invent" in unknown.json()["reply"].lower()
    upload = client.post(
        "/api/docs/upload",
        files={"file": ("extra.md", b"Staff coffee is free.", "text/markdown")},
    )
    assert upload.status_code == 200
    assert upload.json()["name"] == "extra.md"



def test_flask_deploy_api(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    from app import app as flask_app

    client = flask_app.test_client()
    status = client.get("/api/deploy")
    assert status.status_code == 200
    body = status.get_json()
    assert body["headline"] == "Deployment & Cloud"
    packed = client.post("/api/deploy/docker")
    assert packed.status_code == 200
    assert packed.get_json()["ok"] is True
    unknown = client.post("/api/deploy/heroku")
    assert unknown.status_code == 404


def test_streamlit_app_compiles():
    source = __import__("pathlib").Path("streamlit_app.py").read_text(encoding="utf-8")
    compile(source, "streamlit_app.py", "exec")
