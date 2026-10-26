#!/usr/bin/env python3
"""Build a static guest widget that answers from the same Docs index."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.desk import PHRASES, embed_script
from src.rag import UNKNOWN_REPLY, build_index, configure

OUT = ROOT / "guest-site"


def main() -> None:
    configure(ROOT / "docs" / "business", ROOT / "data" / "rag_index.json")
    index = build_index()
    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / "static" / "styles.css", OUT / "styles.css")
    payload = {
        "unknown": UNKNOWN_REPLY,
        "phrases": PHRASES,
        "idf": index.get("idf") or {},
        "chunks": index.get("chunks") or [],
        "vectors": index.get("vectors") or [],
        "files": index.get("files") or [],
        "min_score": 0.16,
        "top_k": 3,
    }
    (OUT / "knowledge.json").write_text(json.dumps(payload), encoding="utf-8")
    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lentswe · Tsotsa Kitchen</title>
  <link rel="stylesheet" href="{css}" />
  <style>
    body {{ background: #faf8f4; min-height: 100vh; }}
    .page {{ max-width: 100%; padding: 0.85rem; min-height: 100vh; }}
    .thread {{ max-height: none; flex: 1; }}
  </style>
</head>
<body>
  <div class="page">
    <p class="kicker">Product support</p>
    <h1 style="font-size:1.3rem">Lentswe</h1>
    <p class="hint">Guest chat for Tsotsa Kitchen. No staff pin. Ask a price, hours, or policy — I cite the file.</p>
    <section id="log" class="thread" aria-live="polite">
      <div id="empty-state" class="empty">
        <p class="empty-title">How can I help?</p>
        <p>Try: how much is the mutton bunny chow?</p>
      </div>
    </section>
    <form id="type-form" class="dock">
      <input id="text-input" type="text" placeholder="Ask anything…" autocomplete="off" />
      <button type="submit" class="send">Send</button>
    </form>
    <p id="status" class="status">Ready.</p>
  </div>
  <script src="{js}"></script>
</body>
</html>
"""
    (OUT / "index.html").write_text(html.format(css="./styles.css", js="./widget.js"), encoding="utf-8")
    (OUT / "200.html").write_text(html.format(css="./styles.css", js="./widget.js"), encoding="utf-8")
    widget_dir = OUT / "widget"
    widget_dir.mkdir(parents=True, exist_ok=True)
    (widget_dir / "index.html").write_text(
        html.format(css="../styles.css", js="../widget.js"), encoding="utf-8"
    )
    (OUT / "embed.js").write_text(
        embed_script("https://tsotsaakum.github.io/voice-assistant").replace(
            "b+'/widget'",
            "b.replace(/\\/$/,'')+'/'",
        ),
        encoding="utf-8",
    )
    (OUT / "widget.js").write_text(_WIDGET_JS, encoding="utf-8")
    print(f"wrote {OUT}")


_WIDGET_JS = r"""
const form = document.getElementById("type-form");
const input = document.getElementById("text-input");
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const STOP = new Set(["a","an","and","are","as","at","be","do","for","from","how","i","in","is","it","me","my","of","on","or","please","that","the","to","us","we","what","when","where","which","who","you","your"]);
const BUSINESS = /\b(price|prices|pricing|cost|costs|how much (?:is|are|does|do|for|would)|fee|fees|charge|charges|quote|rand|rands|\br\d+|vat|policy|policies|refund|refunds|hours|opening|open until|closing|close|closed|booking|deposit|cancellation|cancel|menu|catering|platter|delivery|deliver|terms|wifi)\b/i;
const ASSET_BASE = (document.currentScript && document.currentScript.src || "./widget.js").replace(/[^/]+$/, "");
let knowledge = null;
let liveOk = true;

function addBubble(role, text, caption, sources) {
  document.getElementById("empty-state")?.remove();
  const div = document.createElement("div");
  div.className = "bubble " + role;
  if (caption) {
    const small = document.createElement("small");
    small.textContent = caption;
    div.appendChild(small);
  }
  div.appendChild(document.createTextNode(text));
  if (sources && sources.length) {
    const cite = document.createElement("em");
    cite.className = "cite";
    cite.textContent = "Source: " + sources.map(function (row) { return row.file; }).filter(Boolean).join(", ");
    div.appendChild(cite);
  }
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function stems(token) {
  const forms = {};
  forms[token] = true;
  if (token.length > 4 && token.endsWith("ies")) forms[token.slice(0, -3) + "y"] = true;
  if (token.length > 4 && token.endsWith("es")) forms[token.slice(0, -2)] = true;
  if (token.length > 3 && token.endsWith("s")) forms[token.slice(0, -1)] = true;
  if (token.length > 5 && token.endsWith("ing")) forms[token.slice(0, -3)] = true;
  if (token.length > 4 && token.endsWith("y")) forms[token.slice(0, -1)] = true;
  return Object.keys(forms);
}

function tokenize(text) {
  const tokens = [];
  const matches = String(text || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  matches.forEach(function (raw) {
    if (STOP.has(raw)) return;
    stems(raw).forEach(function (item) { tokens.push(item); });
  });
  return tokens;
}

function normalize(vec) {
  let sum = 0;
  Object.keys(vec).forEach(function (key) { sum += vec[key] * vec[key]; });
  const norm = Math.sqrt(sum) || 1;
  const out = {};
  Object.keys(vec).forEach(function (key) { out[key] = vec[key] / norm; });
  return out;
}

function cosine(a, b) {
  let score = 0;
  Object.keys(a).forEach(function (key) {
    if (b[key]) score += a[key] * b[key];
  });
  return score;
}

function translate(text) {
  const match = String(text || "").trim().match(/^translate\s+[“"]?(.+?)[”"]?\s+(?:to|into)\s+([A-Za-z ]+)$/i);
  if (!match || !knowledge) return null;
  const phrase = match[1].trim().toLowerCase();
  const lang = match[2].trim().toLowerCase().replace(/^isi/, "").replace(/\s+/g, "");
  const aliases = { zulu: "zulu", xhosa: "xhosa", sepedi: "sepedi", sotho: "sesotho", sesotho: "sesotho", tswana: "setswana", setswana: "setswana", tsonga: "tsonga", swati: "swati", venda: "venda", ndebele: "ndebele", afrikaans: "afrikaans", english: "english" };
  const key = aliases[lang];
  const book = knowledge.phrases[phrase];
  if (!key || !book || !book[key]) return null;
  return book[key] + " (" + key + ", phrase book).";
}

function retrieve(query) {
  if (!knowledge) return [];
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const tf = {};
  tokens.forEach(function (term) { tf[term] = (tf[term] || 0) + 1; });
  const raw = {};
  Object.keys(tf).forEach(function (term) {
    if (knowledge.idf[term] == null) return;
    raw[term] = (tf[term] / tokens.length) * Number(knowledge.idf[term]);
  });
  const qvec = normalize(raw);
  const scored = [];
  (knowledge.chunks || []).forEach(function (row, i) {
    const vec = knowledge.vectors[i] || {};
    const score = cosine(qvec, vec);
    if (score < (knowledge.min_score || 0.16)) return;
    scored.push({ source: row.source, text: row.text, score: score, file: row.source });
  });
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, knowledge.top_k || 3);
}

function localReply(text) {
  const translated = translate(text);
  if (translated) return { reply: translated, sources: [] };
  const hits = retrieve(text);
  if (hits.length) {
    const sources = [];
    hits.forEach(function (hit) {
      if (!sources.some(function (row) { return row.file === hit.file; })) {
        sources.push({ file: hit.file });
      }
    });
    return { reply: hits[0].text, sources: sources };
  }
  if (BUSINESS.test(text)) {
    return { reply: (knowledge && knowledge.unknown) || "I don't have that in the business documents.", sources: [] };
  }
  return {
    reply: "This guest page answers Tsotsa Kitchen prices, hours, and policy from the files. Try “how much is the mutton bunny chow?”",
    sources: [],
  };
}

async function liveReply(text) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, language: "english" }),
  });
  if (!res.ok) throw new Error("chat failed");
  return res.json();
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  const text = (input.value || "").trim();
  if (!text) return;
  input.value = "";
  addBubble("user", text, "You");
  statusEl.textContent = "Thinking…";
  try {
    let data;
    if (liveOk) {
      try {
        data = await liveReply(text);
        if (!data || !data.reply) throw new Error("empty");
      } catch (err) {
        liveOk = false;
        data = localReply(text);
      }
    } else {
      data = localReply(text);
    }
    addBubble("bot", data.reply, "Lentswe", data.sources);
    statusEl.textContent = "Ready.";
  } catch (err) {
    statusEl.textContent = "Chat failed.";
  }
});

fetch(ASSET_BASE + "knowledge.json")
  .then(function (res) { return res.json(); })
  .then(function (data) { knowledge = data; })
  .catch(function () { knowledge = { phrases: {}, chunks: [], vectors: [], idf: {} }; });
"""


if __name__ == "__main__":
    main()
