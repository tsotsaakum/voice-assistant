"""Business-document RAG: retrieve chunks from files on disk.

Drop PDFs, markdown, or text into ``docs/business/``. The index lives in
``data/rag_index.json`` (no cloud embedding key). Answers cite the source
filename. If nothing matches, Lentswe says she does not know — Groq must
not invent a price or policy.
"""

from __future__ import annotations

import json
import math
import re
import threading
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_DOCS = ROOT / "docs" / "business"
_DEFAULT_INDEX = ROOT / "data" / "rag_index.json"

DOCS = _DEFAULT_DOCS
INDEX = _DEFAULT_INDEX

SUPPORTED = {".md", ".markdown", ".txt", ".pdf"}
CHUNK_SIZE = 520
CHUNK_OVERLAP = 80
TOP_K = 3
MIN_SCORE = 0.16

UNKNOWN_REPLY = (
    "I don't have that in the business documents. "
    "I will not invent a price or a policy."
)

_TOKEN = re.compile(r"[a-z0-9]+")
_STOP = frozenset(
    {
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "do",
        "for",
        "from",
        "how",
        "i",
        "in",
        "is",
        "it",
        "me",
        "my",
        "of",
        "on",
        "or",
        "please",
        "that",
        "the",
        "to",
        "us",
        "we",
        "what",
        "when",
        "where",
        "which",
        "who",
        "you",
        "your",
    }
)
_BUSINESS_FACT = re.compile(
    r"(?i)\b("
        r"price|prices|pricing|cost|costs|how much (?:is|are|does|do|for|would)|"
        r"fee|fees|charge|charges|"
    r"quote|rand|rands|\br\d+|vat|policy|policies|refund|refunds|"
    r"hours|opening|open until|closing|close|closed|booking|deposit|"
    r"cancellation|cancel|menu|catering|platter|"
    r"delivery|deliver|terms"
    r")\b"
)

_LOCK = threading.Lock()
_CACHE: dict | None = None
_LAST_SOURCES: list[dict] = []


@dataclass(frozen=True)
class Hit:
    source: str
    text: str
    score: float
    chunk_id: str


def configure(docs_dir: Path | None = None, index_path: Path | None = None) -> None:
    """Point RAG at a folder (tests) and drop the in-memory index."""
    global DOCS, INDEX, _CACHE
    with _LOCK:
        DOCS = Path(docs_dir) if docs_dir is not None else _DEFAULT_DOCS
        INDEX = Path(index_path) if index_path is not None else _DEFAULT_INDEX
        _CACHE = None
        _LAST_SOURCES.clear()


def unknown_reply() -> str:
    return UNKNOWN_REPLY


def looks_like_business_fact(user_text: str) -> bool:
    return bool(_BUSINESS_FACT.search(user_text or ""))


def tokenize(text: str) -> list[str]:
    tokens = []
    for raw in _TOKEN.findall((text or "").lower()):
        if raw in _STOP:
            continue
        tokens.extend(_stems(raw))
    return tokens


def _stems(token: str) -> list[str]:
    forms = {token}
    if len(token) > 4 and token.endswith("ies"):
        forms.add(token[:-3] + "y")
    if len(token) > 4 and token.endswith("es"):
        forms.add(token[:-2])
    if len(token) > 3 and token.endswith("s"):
        forms.add(token[:-1])
    if len(token) > 5 and token.endswith("ing"):
        forms.add(token[:-3])
    if len(token) > 4 and token.endswith("y"):
        forms.add(token[:-1])
    return list(forms)


def _normalize(vec: dict[str, float]) -> dict[str, float]:
    norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
    return {k: v / norm for k, v in vec.items()}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    return sum(a[k] * b[k] for k in set(a) & set(b))


def _extract_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    try:
        reader = PdfReader(str(path))
    except Exception:
        return ""
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(pages)


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(path)
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""


def chunk_text(text: str, source: str) -> list[dict]:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if not cleaned:
        return []
    chunks = []
    step = max(CHUNK_SIZE - CHUNK_OVERLAP, 1)
    idx = 0
    for start in range(0, len(cleaned), step):
        piece = cleaned[start : start + CHUNK_SIZE].strip()
        if piece:
            chunks.append(
                {
                    "id": f"{source}:{idx}",
                    "source": source,
                    "text": piece,
                }
            )
            idx += 1
        if start + CHUNK_SIZE >= len(cleaned):
            break
    return chunks


def list_source_files() -> list[Path]:
    if not DOCS.is_dir():
        return []
    files = [
        p
        for p in DOCS.iterdir()
        if p.is_file()
        and p.suffix.lower() in SUPPORTED
        and not p.name.lower().startswith("readme")
    ]
    return sorted(files, key=lambda p: p.name.lower())


def _fingerprint() -> str:
    parts = []
    for path in list_source_files():
        try:
            stat = path.stat()
            parts.append(f"{path.name}:{stat.st_mtime_ns}:{stat.st_size}")
        except OSError:
            parts.append(path.name)
    return "|".join(parts)


def _build_vectors(chunks: list[dict]) -> tuple[dict[str, float], list[dict[str, float]]]:
    docs_tokens = [tokenize(row["text"]) for row in chunks]
    df: Counter[str] = Counter()
    for tokens in docs_tokens:
        df.update(set(tokens))
    n = len(docs_tokens) or 1
    idf = {term: math.log((1 + n) / (1 + count)) + 1.0 for term, count in df.items()}
    vectors = []
    for tokens in docs_tokens:
        tf = Counter(tokens)
        length = len(tokens) or 1
        raw = {term: (tf[term] / length) * idf[term] for term in tf if term in idf}
        vectors.append(_normalize(raw))
    return idf, vectors


def build_index() -> dict:
    DOCS.mkdir(parents=True, exist_ok=True)
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    chunks: list[dict] = []
    files = []
    for path in list_source_files():
        text = extract_text(path)
        file_chunks = chunk_text(text, path.name)
        chunks.extend(file_chunks)
        files.append(
            {
                "name": path.name,
                "bytes": path.stat().st_size,
                "chunks": len(file_chunks),
            }
        )
    idf, vectors = _build_vectors(chunks)
    payload = {
        "built_at": datetime.now(timezone.utc).isoformat(),
        "fingerprint": _fingerprint(),
        "files": files,
        "chunks": chunks,
        "idf": idf,
        "vectors": vectors,
    }
    INDEX.write_text(json.dumps(payload), encoding="utf-8")
    global _CACHE
    _CACHE = payload
    return payload


def _load_index() -> dict:
    global _CACHE
    if _CACHE is not None and _CACHE.get("fingerprint") == _fingerprint():
        return _CACHE
    if INDEX.is_file():
        try:
            data = json.loads(INDEX.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            data = None
        if isinstance(data, dict) and data.get("fingerprint") == _fingerprint():
            _CACHE = data
            return data
    return build_index()


def ensure_index() -> dict:
    with _LOCK:
        return _load_index()


def retrieve(user_text: str, top_k: int = TOP_K, min_score: float = MIN_SCORE) -> list[Hit]:
    query = (user_text or "").strip()
    if not query:
        _set_last_sources([])
        return []
    with _LOCK:
        data = _load_index()
        chunks = data.get("chunks") or []
        vectors = data.get("vectors") or []
        idf = data.get("idf") or {}
        if not chunks or not vectors or not idf:
            _set_last_sources([])
            return []
        qvec = _normalize(
            {
                term: (count / (len(tokenize(query)) or 1)) * float(idf[term])
                for term, count in Counter(tokenize(query)).items()
                if term in idf
            }
        )
        scored: list[Hit] = []
        for row, vec in zip(chunks, vectors):
            if not isinstance(row, dict) or not isinstance(vec, dict):
                continue
            score = _cosine(qvec, {str(k): float(v) for k, v in vec.items()})
            if score < min_score:
                continue
            scored.append(
                Hit(
                    source=str(row.get("source") or "unknown"),
                    text=str(row.get("text") or "").strip(),
                    score=round(float(score), 4),
                    chunk_id=str(row.get("id") or ""),
                )
            )
        scored.sort(key=lambda hit: hit.score, reverse=True)
        hits = scored[: max(1, top_k)]
        _set_last_sources(hits)
        return hits


def _set_last_sources(hits: list[Hit]) -> None:
    global _LAST_SOURCES
    seen = []
    files = []
    for hit in hits:
        if hit.source in seen:
            continue
        seen.append(hit.source)
        files.append({"file": hit.source, "score": hit.score})
    _LAST_SOURCES = files


def last_sources() -> list[dict]:
    return list(_LAST_SOURCES)


def clear_last_sources() -> None:
    _LAST_SOURCES.clear()


def format_context(hits: list[Hit]) -> str:
    if not hits:
        return "none"
    blocks = []
    for hit in hits:
        blocks.append(f"[{hit.source}] {hit.text}")
    return "\n\n".join(blocks)


def grounded_reply(hits: list[Hit]) -> str:
    """Groq-off answer: quote retrieved text and cite the file. Never invent."""
    if not hits:
        return UNKNOWN_REPLY
    top = hits[0]
    sources = []
    for hit in hits:
        if hit.source not in sources:
            sources.append(hit.source)
    cited = ", ".join(sources)
    return f"{top.text}\n\nSource: {cited}"


def public_status() -> dict:
    data = ensure_index()
    files = data.get("files") or []
    return {
        "folder": str(DOCS.relative_to(ROOT)) if DOCS.is_relative_to(ROOT) else str(DOCS),
        "index": str(INDEX.relative_to(ROOT)) if INDEX.is_relative_to(ROOT) else str(INDEX),
        "built_at": data.get("built_at"),
        "files": files,
        "file_count": len(files),
        "chunk_count": len(data.get("chunks") or []),
        "cloud_key": False,
        "hint": (
            "Drop .md, .txt, or .pdf files into docs/business/ then tap Rebuild index. "
            "No embedding API key."
        ),
    }


def save_upload(filename: str, content: bytes) -> dict | None:
    name = Path(filename or "").name
    suffix = Path(name).suffix.lower()
    if suffix not in SUPPORTED or not content:
        return None
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "-", name).strip(".-") or f"upload{suffix}"
    if Path(safe).suffix.lower() not in SUPPORTED:
        safe = f"{safe}{suffix}"
    DOCS.mkdir(parents=True, exist_ok=True)
    path = DOCS / safe
    path.write_bytes(content)
    build_index()
    return {"name": path.name, "bytes": len(content)}
