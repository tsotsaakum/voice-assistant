from pathlib import Path

from src.brain import think
from src.cloud_storage import LOCAL_STORE, sync_app_data
from src.deploy import (
    TEACH_IDS,
    WIRED_IDS,
    catalog,
    is_deploy_query,
    pack,
    public_status,
)


def test_catalog_wires_all_five_platforms():
    ids = [item["id"] for item in catalog()]
    assert ids == ["streamlit", "fastapi", "vercel", "docker", "aws"]
    assert TEACH_IDS == ("streamlit", "vercel", "docker")
    assert WIRED_IDS == ("fastapi", "aws")


def test_public_status_teaches_only_streamlit_docker_vercel():
    data = public_status()
    assert [item["id"] for item in data["teach"]] == ["streamlit", "vercel", "docker"]
    assert [item["id"] for item in data["wired"]] == ["fastapi", "aws"]
    for item in data["teach"]:
        assert item["how"]
        assert item["ready"] is True
    for item in data["wired"]:
        assert "how" not in item


def test_docker_pack_reports_compose_files():
    result = pack("docker")
    assert result["ok"] is True
    assert result["action"] == "packed"
    assert "Dockerfile" in result["platform"]["files"]
    assert (Path("Dockerfile")).is_file()
    assert (Path("docker-compose.yml")).is_file()


def test_vercel_prepare_without_token_is_packed_not_live(monkeypatch):
    monkeypatch.delenv("VERCEL_TOKEN", raising=False)
    result = pack("vercel")
    assert result["ok"] is True
    assert result["live_push"] is False
    assert "VERCEL_TOKEN" in result["detail"]


def test_aws_sync_falls_back_without_credentials(monkeypatch, tmp_path):
    monkeypatch.delenv("AWS_S3_BUCKET", raising=False)
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
    result = pack("aws")
    assert result["ok"] is True
    assert result["sync"]["backend"] == "local-fallback"
    assert result["sync"]["live"] is False
    synced = sync_app_data()
    assert synced["blocked"]
    assert any(LOCAL_STORE.glob("*.json"))


def test_deploy_queries_do_not_teach_fastapi_or_aws(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    fastapi_reply = think("how do I use FastAPI?", "english", conversation_id="deploy-fastapi")
    assert "fastapi_app.py" in fastapi_reply.lower() or "FastAPI" in fastapi_reply
    assert "pip install" not in fastapi_reply.lower()
    assert "Open Deploy for Streamlit" in fastapi_reply
    aws_reply = think("how do I set up AWS S3?", "english", conversation_id="deploy-aws")
    assert "Open Deploy for Streamlit" in aws_reply
    assert "Create a bucket" not in aws_reply


def test_streamlit_docker_vercel_get_how_to_replies(monkeypatch):
    monkeypatch.setattr("src.brain.openai_enabled", lambda: False)
    streamlit = think("how do I run the Streamlit easy UI?", "english", conversation_id="d1")
    assert "streamlit run" in streamlit.lower()
    docker = think("pack with docker", "english", conversation_id="d2")
    assert "Dockerfile" in docker or "docker compose" in docker.lower()
    vercel = think("how do I host on Vercel?", "english", conversation_id="d3")
    assert "vercel.json" in vercel or "npx vercel" in vercel
    status = think("deploy status", "english", conversation_id="d4")
    assert "Streamlit" in status
    assert "Docker" in status
    assert "Vercel" in status


def test_pack_for_trip_is_not_swallowed_by_docker_pack():
    assert is_deploy_query("pack with docker")
    assert not is_deploy_query("pack for Durban")
    assert is_deploy_query("how do I run the Streamlit easy UI?")
