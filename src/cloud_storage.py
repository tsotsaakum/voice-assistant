"""AWS S3 storage with a local folder fallback when credentials are missing."""

from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_STORE = ROOT / "data" / "cloud-store"
SYNC_FILES = (
    "knowledge_base.json",
    "conversations.json",
    "lentswe.json",
)


def bucket_name() -> str:
    return (os.getenv("AWS_S3_BUCKET") or "").strip()


def region() -> str:
    return (os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "af-south-1").strip()


def credentials_present() -> bool:
    if os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"):
        return True
    try:
        import boto3

        session = boto3.session.Session()
        creds = session.get_credentials()
        return creds is not None
    except Exception:
        return False


def live_s3_ready() -> bool:
    return bool(bucket_name()) and credentials_present()


def status() -> dict:
    live = live_s3_ready()
    blocked = []
    if not bucket_name():
        blocked.append("AWS_S3_BUCKET")
    if not credentials_present():
        blocked.append("AWS credentials")
    return {
        "id": "aws",
        "name": "AWS",
        "role": "storage + compute",
        "storage": "s3" if live else "local-fallback",
        "bucket": bucket_name() or None,
        "region": region(),
        "live": live,
        "blocked": blocked,
        "local_store": str(LOCAL_STORE),
        "compute": "infra/aws-cloudformation.yml",
    }


def _local_put(name: str, payload: dict) -> Path:
    LOCAL_STORE.mkdir(parents=True, exist_ok=True)
    path = LOCAL_STORE / name
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def _read_data_file(name: str) -> dict:
    path = ROOT / "data" / name
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def put_json(name: str, payload: dict) -> dict:
    if live_s3_ready():
        import boto3

        key = f"lentswe/{name}"
        boto3.client("s3", region_name=region()).put_object(
            Bucket=bucket_name(),
            Key=key,
            Body=json.dumps(payload, indent=2).encode("utf-8"),
            ContentType="application/json",
        )
        return {"ok": True, "backend": "s3", "key": key, "bucket": bucket_name()}
    path = _local_put(name, payload)
    return {
        "ok": True,
        "backend": "local-fallback",
        "path": str(path),
        "blocked_live": True,
        "detail": "No AWS bucket/credentials. Packed to local cloud-store instead of S3.",
    }


def sync_app_data() -> dict:
    written = []
    for name in SYNC_FILES:
        result = put_json(name, _read_data_file(name))
        written.append({"file": name, **result})
    live = live_s3_ready()
    return {
        "ok": True,
        "live": live,
        "backend": "s3" if live else "local-fallback",
        "files": written,
        "blocked": [] if live else status()["blocked"],
    }
