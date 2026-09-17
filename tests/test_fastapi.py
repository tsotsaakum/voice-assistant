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
    assert [p["id"] for p in body["teach"]] == ["streamlit", "vercel", "docker"]
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
