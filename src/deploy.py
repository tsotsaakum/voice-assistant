"""Deployment & Cloud packaging for Lentswe.

Wires Streamlit, FastAPI, Vercel, Docker, and AWS. In-app teaching copy
stays on Streamlit (easy UI), Docker (pack), and Vercel (hosting).
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

from src import cloud_storage

ROOT = Path(__file__).resolve().parents[1]
TEACH_IDS = ("streamlit", "vercel", "docker")
WIRED_IDS = ("fastapi", "aws")


def _exists(*parts: str) -> bool:
    return (ROOT.joinpath(*parts)).is_file()


def _docker_available() -> bool:
    return shutil.which("docker") is not None


def _vercel_token() -> bool:
    return bool((os.getenv("VERCEL_TOKEN") or "").strip())


def streamlit_platform() -> dict:
    ready = _exists("streamlit_app.py")
    return {
        "id": "streamlit",
        "name": "Streamlit",
        "role": "easy UI",
        "teach": True,
        "ready": ready,
        "live": ready,
        "command": "streamlit run streamlit_app.py --server.port 8501",
        "url": "http://127.0.0.1:8501",
        "files": ["streamlit_app.py", ".streamlit/config.toml"],
        "how": (
            "Open Deploy, then run the Streamlit command. You get a simple chat "
            "page that talks to the same Lentswe brain — no extra cloud key."
        ),
        "blocked": [] if ready else ["streamlit_app.py missing"],
    }


def fastapi_platform() -> dict:
    ready = _exists("fastapi_app.py")
    return {
        "id": "fastapi",
        "name": "FastAPI",
        "role": "backend APIs",
        "teach": False,
        "ready": ready,
        "live": ready,
        "command": "uvicorn fastapi_app:app --host 0.0.0.0 --port 8000",
        "url": "http://127.0.0.1:8000/docs",
        "files": ["fastapi_app.py", "api/index.py"],
        "routes": [
            "GET /health",
            "GET /api/status",
            "POST /api/chat",
            "GET /api/knowledge",
            "GET /api/deploy",
        ],
        "blocked": [] if ready else ["fastapi_app.py missing"],
    }


def vercel_platform() -> dict:
    packed = _exists("vercel.json") and _exists("api", "index.py")
    token = _vercel_token()
    blocked = []
    if not packed:
        blocked.append("vercel.json")
    if not token:
        blocked.append("VERCEL_TOKEN")
    return {
        "id": "vercel",
        "name": "Vercel",
        "role": "hosting",
        "teach": True,
        "ready": packed,
        "live": packed and token,
        "command": "npx vercel --prod",
        "files": ["vercel.json", "api/index.py", "api/requirements.txt"],
        "how": (
            "Vercel hosts the FastAPI entry in api/index.py. Config is already packed. "
            "A live push needs VERCEL_TOKEN in the environment; without it the files "
            "are still ready to deploy from your own machine."
        ),
        "blocked": blocked,
    }


def docker_platform() -> dict:
    packed = _exists("Dockerfile") and _exists("docker-compose.yml")
    docker = _docker_available()
    blocked = []
    if not packed:
        blocked.append("Dockerfile")
    if not docker:
        blocked.append("docker CLI")
    return {
        "id": "docker",
        "name": "Docker",
        "role": "pack your app",
        "teach": True,
        "ready": packed,
        "live": packed and docker,
        "command": "docker compose up --build",
        "image": "lentswe:local",
        "files": ["Dockerfile", "docker-compose.yml", ".dockerignore", "requirements-cloud.txt"],
        "how": (
            "Docker packs Streamlit, the Lentswe page, and the API into one image. "
            "Run docker compose up --build, then open port 8501 for the easy UI "
            "or 7000 for the full page."
        ),
        "blocked": blocked,
    }


def aws_platform() -> dict:
    packed = _exists("infra", "aws-cloudformation.yml")
    storage = cloud_storage.status()
    blocked = list(storage["blocked"])
    if not packed:
        blocked.append("cloudformation template")
    return {
        "id": "aws",
        "name": "AWS",
        "role": "storage + compute",
        "teach": False,
        "ready": packed,
        "live": bool(storage["live"]),
        "files": ["infra/aws-cloudformation.yml", "src/cloud_storage.py"],
        "storage": storage["storage"],
        "compute": storage["compute"],
        "blocked": blocked,
    }


def catalog() -> list[dict]:
    return [
        streamlit_platform(),
        fastapi_platform(),
        vercel_platform(),
        docker_platform(),
        aws_platform(),
    ]


def public_status() -> dict:
    platforms = catalog()
    teach = [p for p in platforms if p["id"] in TEACH_IDS]
    wired = [p for p in platforms if p["id"] in WIRED_IDS]
    blocked = []
    for item in platforms:
        for reason in item.get("blocked") or []:
            blocked.append({"platform": item["id"], "reason": reason})
    return {
        "headline": "Deployment & Cloud",
        "summary": (
            "Run Lentswe as a live app. Guided path: Streamlit for an easy UI, "
            "Docker to pack it, Vercel to host it."
        ),
        "teach": teach,
        "wired": wired,
        "platforms": platforms,
        "blocked": blocked,
    }


def pack(platform_id: str) -> dict:
    pid = (platform_id or "").strip().lower()
    if pid == "streamlit":
        item = streamlit_platform()
        return {"ok": item["ready"], "platform": item, "action": "checked"}
    if pid == "docker":
        item = docker_platform()
        version = None
        if _docker_available():
            try:
                version = subprocess.check_output(
                    ["docker", "--version"], text=True, timeout=8
                ).strip()
            except (OSError, subprocess.SubprocessError):
                version = "docker CLI present"
        return {
            "ok": item["ready"],
            "platform": item,
            "action": "packed",
            "docker_version": version,
            "build": "docker compose build",
            "run": item["command"],
            "detail": (
                "Dockerfile and compose file are packed."
                if item["ready"]
                else "Docker packaging files are missing."
            ),
        }
    if pid == "vercel":
        item = vercel_platform()
        return {
            "ok": item["ready"],
            "platform": item,
            "action": "prepared",
            "live_push": item["live"],
            "detail": (
                "vercel.json is packed. Live deploy needs VERCEL_TOKEN."
                if not item["live"]
                else "Vercel token is set. You can run npx vercel --prod."
            ),
        }
    if pid == "fastapi":
        item = fastapi_platform()
        return {"ok": item["ready"], "platform": item, "action": "checked"}
    if pid == "aws":
        synced = cloud_storage.sync_app_data()
        item = aws_platform()
        return {
            "ok": True,
            "platform": item,
            "action": "synced",
            "sync": synced,
        }
    return {"ok": False, "detail": "Unknown platform."}


def spoken_status() -> str:
    data = public_status()
    teach_bits = []
    for item in data["teach"]:
        state = "ready" if item["ready"] else "not packed"
        extra = ""
        if item["id"] == "vercel" and not item["live"]:
            extra = ", live push blocked without VERCEL_TOKEN"
        elif item["id"] == "docker" and not item["live"]:
            extra = ", docker CLI not on this machine"
        teach_bits.append(f"{item['name']} {state}{extra}")
    wired_bits = [f"{item['name']} wired" for item in data["wired"]]
    return (
        "Deployment and cloud: "
        + "; ".join(teach_bits)
        + ". "
        + "; ".join(wired_bits)
        + ". Open the Deploy tab for Streamlit, Docker, and Vercel."
    )


def spoken_help(user_text: str) -> str:
    text = (user_text or "").lower()
    if any(w in text for w in ("fastapi", "fast api", "uvicorn")):
        return (
            "FastAPI is already wired as the backend API in fastapi_app.py. "
            "Open Deploy for Streamlit, Docker, and Vercel."
        )
    if any(w in text for w in ("aws", "s3", "ecs", "fargate", "cloudformation")):
        return (
            "AWS storage and compute are packed in infra/ and src/cloud_storage.py. "
            "Open Deploy for Streamlit, Docker, and Vercel."
        )
    if "streamlit" in text or "easy ui" in text:
        item = streamlit_platform()
        return (
            "Streamlit is the easy UI. From the project folder run: "
            f"{item['command']}. Then open {item['url']}. "
            "Same Lentswe brain as this page — type a message and she answers."
        )
    if "vercel" in text or "hosting" in text or "host on" in text:
        item = vercel_platform()
        token_note = (
            "A live push needs VERCEL_TOKEN; without it the config is still packed."
            if not item["live"]
            else "A Vercel token is set, so you can run npx vercel --prod."
        )
        return (
            "Vercel hosts Lentswe from vercel.json and api/index.py. "
            f"{token_note} Command: {item['command']}."
        )
    if "docker" in text or "pack" in text or "compose" in text:
        item = docker_platform()
        cli = (
            "Docker CLI is here, so you can run docker compose up --build."
            if item["live"]
            else "This machine has no docker CLI, but the Dockerfile is packed."
        )
        return (
            "Docker packs the app. Files: Dockerfile and docker-compose.yml. "
            f"{cli} Easy UI on port 8501, full Lentswe page on 7000."
        )
    if "deploy" in text or "cloud" in text:
        return spoken_status()
    return spoken_status()


def is_deploy_query(user_text: str) -> bool:
    text = (user_text or "").lower()
    if not text:
        return False
    keys = (
        "deploy",
        "streamlit",
        "vercel",
        "docker",
        "fastapi",
        "fast api",
        "aws",
        "hosting",
        "easy ui",
        "pack the app",
        "pack with docker",
        "pack my app",
        "cloud service",
        "docker compose",
        "dockerfile",
    )
    return any(k in text for k in keys)
