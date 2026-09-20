const languageSelect = document.getElementById("language");
const micButton = document.getElementById("mic");
const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const form = document.getElementById("type-form");
const textInput = document.getElementById("text-input");
const spokenHint = document.getElementById("spoken-hint");
const stopSpeechBtn = document.getElementById("stop-speech");

const CONVO_KEY = "lentswe-conversation-id";
const history = [];
let conversationId = sessionStorage.getItem(CONVO_KEY) || "";
const languagesById = new Map();
let recording = false;
let recorder = null;
let chunks = [];
let currentAudio = null;

const JABU_GREETINGS = [
  { lang: "english", say: "Hello", word: "Hello", langLabel: "English" },
  { lang: "afrikaans", say: "Hallo", word: "Hallo", langLabel: "Afrikaans" },
  { lang: "xhosa", say: "Molo", word: "Molo", langLabel: "isiXhosa" },
  { lang: "zulu", say: "Sawubona", word: "Sawubona", langLabel: "isiZulu" },
  { lang: "swati", say: "Sawubona", word: "Sawubona", langLabel: "siSwati" },
  { lang: "sepedi", say: "Dumela", word: "Dumela", langLabel: "Sepedi" },
  { lang: "sesotho", say: "Dumela", word: "Dumela", langLabel: "Sesotho" },
  { lang: "setswana", say: "Dumela", word: "Dumela", langLabel: "Setswana" },
  { lang: "tsonga", say: "Avuxeni", word: "Avuxeni", langLabel: "Xitsonga" },
  { lang: "venda", say: "Ndaa", word: "Ndaa", langLabel: "Tshivenda" },
  { lang: "ndebele", say: "Lotjhani", word: "Lotjhani", langLabel: "isiNdebele" },
];

function setStatus(text) {
  statusEl.textContent = text;
}

async function showGroqLine() {
  const el = document.getElementById("groq-line");
  if (!el) return;
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    if (data.groq) {
      el.textContent = "Groq chat: on (" + (data.model || "model") + ")";
    } else {
      el.textContent = "Groq chat: off — paste OPENAI_API_KEY in .env, save, restart app.py";
    }
  } catch (err) {
    el.textContent = "Groq chat: cannot reach the server. Is app.py running?";
  }
}

showGroqLine();

function hideEmpty() {
  document.getElementById("empty-state")?.remove();
}

function showEmpty() {
  logEl.innerHTML = "";
  const div = document.createElement("div");
  div.id = "empty-state";
  div.className = "empty";
  div.innerHTML =
    "<p class=\"empty-title\">She is listening in eleven languages.</p>" +
    "<p>Tap a greeting, ask for weather, or type in the box below.</p>";
  logEl.appendChild(div);
}

function updateMemoryBar(data) {
  const line = document.getElementById("memory-line");
  const session = document.getElementById("memory-session");
  const cid = (data && data.conversation_id) || conversationId || "…";
  const turns = data && typeof data.turn_count === "number" ? data.turn_count : history.length;
  const active = !data || data.active !== false;
  if (line) {
    line.innerHTML = active
      ? "This chat remembers <strong>" + turns + "</strong> turns · session <code>" + cid + "</code>"
      : "Session <code>" + cid + "</code> has ended. Start a new chat.";
  }
  if (session) {
    session.textContent = active
      ? "Active session " + cid + " · " + turns + " turns on the server."
      : "This session ended. New chat gives you a fresh conversation id.";
  }
}

async function ensureConversation() {
  if (conversationId) return conversationId;
  const res = await fetch("/api/conversations", { method: "POST" });
  const data = await res.json();
  conversationId = data.conversation_id || "";
  if (conversationId) sessionStorage.setItem(CONVO_KEY, conversationId);
  updateMemoryBar(data);
  return conversationId;
}

function rememberConversation(data) {
  if (data && data.conversation_id) {
    conversationId = data.conversation_id;
    sessionStorage.setItem(CONVO_KEY, conversationId);
  }
  updateMemoryBar(data || {});
}

async function restoreConversation() {
  const saved = sessionStorage.getItem(CONVO_KEY) || "";
  if (!saved) {
    await ensureConversation();
    return;
  }
  const res = await fetch("/api/conversations/" + encodeURIComponent(saved));
  if (!res.ok) {
    conversationId = "";
    sessionStorage.removeItem(CONVO_KEY);
    await ensureConversation();
    return;
  }
  const data = await res.json();
  rememberConversation(data);
  if (data.active === false) {
    await startNewChat();
    return;
  }
  const messages = data.messages || [];
  if (!messages.length) return;
  messages.forEach(function (turn) {
    history.push({ role: turn.role, content: turn.content });
    addBubble(turn.role === "user" ? "user" : "bot", turn.content, turn.role === "user" ? "You" : "Lentswe");
  });
}

async function startNewChat() {
  if (conversationId) {
    await fetch("/api/conversations/" + encodeURIComponent(conversationId) + "/end", { method: "POST" }).catch(function () {
      return null;
    });
  }
  conversationId = "";
  sessionStorage.removeItem(CONVO_KEY);
  history.length = 0;
  showEmpty();
  await ensureConversation();
  setStatus("New chat. This session starts with a clean conversational memory.");
}

function clockLabel() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addBubble(role, text, caption, sources) {
  hideEmpty();
  const div = document.createElement("div");
  div.className = "bubble " + role;
  if (caption) {
    const small = document.createElement("small");
    small.textContent = caption + " · " + clockLabel();
    div.appendChild(small);
  }
  div.appendChild(document.createTextNode(text));
  if (sources && sources.length) {
    const cite = document.createElement("em");
    cite.className = "cite";
    const names = [];
    sources.forEach(function (row) {
      const file = row && row.file;
      if (file && names.indexOf(file) === -1) names.push(file);
    });
    if (names.length) {
      cite.textContent = "Source: " + names.join(", ");
      div.appendChild(cite);
    }
  }
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function isQuiet(text) {
  return /stop listening|stop talking|be quiet|thula|khutsa/i.test(text || "");
}

function updateSpokenHint() {
  if (!spokenHint) return;
  const id = languageSelect.value;
  if (id === "auto") {
    spokenHint.textContent =
      "Auto-detect will try South African locales. For Sepedi, isiXhosa or Setswana, pick the language first.";
    return;
  }
  const meta = languagesById.get(id);
  if (!meta) return;
  const voiceNotes = {
    edge: " uses a dedicated South African neural voice (Microsoft).",
    simba: " uses a native Simba TTS voice. First play may download the model.",
    mms: " uses Meta MMS (Xitsonga). First play may download the model.",
    fallback: " has no dedicated native checkpoint yet — you still hear a multilingual fallback, not a YouTube clone.",
  };
  spokenHint.textContent = meta.name + (voiceNotes[meta.voice] || " can speak back as well as show text.");
}

async function loadLanguages() {
  const res = await fetch("/api/languages");
  const data = await res.json();
  for (const lang of data.languages) {
    languagesById.set(lang.id, lang);
    const opt = document.createElement("option");
    opt.value = lang.id;
    opt.textContent = lang.spoken ? lang.name : lang.name + " (text)";
    languageSelect.appendChild(opt);
  }
  updateSpokenHint();
}

function encodeWav(audioBuffer) {
  const samples = audioBuffer.getChannelData(0);
  const length = samples.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const rate = audioBuffer.sampleRate;

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function blobToWav(blob) {
  const ctx = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const wav = encodeWav(audioBuffer);
  await ctx.close();
  return wav;
}

function speakable(text) {
  const first = (text || "").trim().split(/\s+/)[0].replace(/[.,!?]/g, "");
  const words = [
    "Hello", "Hallo", "Molo", "Molweni", "Sawubona", "Sanibonani",
    "Dumela", "Dumelang", "Avuxeni", "Ndaa", "Aah", "Lotjhani",
  ];
  return words.find(function (w) {
    return w.toLowerCase() === first.toLowerCase();
  }) || text;
}

function stopSpeech() {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.src = "";
  currentAudio = null;
  if (stopSpeechBtn) stopSpeechBtn.hidden = true;
}

function playBlob(blob) {
  stopSpeech();
  return new Promise(function (resolve) {
    const audio = new Audio(URL.createObjectURL(blob));
    currentAudio = audio;
    if (stopSpeechBtn) stopSpeechBtn.hidden = false;
    audio.onended = function () {
      if (currentAudio === audio) currentAudio = null;
      if (stopSpeechBtn) stopSpeechBtn.hidden = true;
      resolve();
    };
    audio.onerror = function () {
      if (stopSpeechBtn) stopSpeechBtn.hidden = true;
      resolve();
    };
    audio.play().catch(function () {
      resolve();
    });
  });
}

async function maybeSpeak(text, language) {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, language: language }),
  });
  const type = res.headers.get("content-type") || "";
  if (!type.includes("audio")) return;
  const blob = await res.blob();
  await playBlob(blob);
}

async function sendText(text) {
  if (handleLocalLists(text)) return;
  const language = languageSelect.value;
  const cid = await ensureConversation();
  addBubble("user", text, "You");
  history.push({ role: "user", content: text });
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, language: language, conversation_id: cid }),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.detail || "Chat failed.");
    return;
  }
  rememberConversation(data);
  history.push({ role: "assistant", content: data.reply });
  addBubble("bot", data.reply, "Lentswe", data.sources);
  if (data.active === false) {
    setStatus("This chat session has ended. Start a new chat.");
    return;
  }
  if (isQuiet(text)) {
    stopSpeech();
    if (recording) stopRecording();
    return;
  }
  setStatus("5 · Speaking — Lentswe is answering…");
  await maybeSpeak(speakable(data.reply), data.language || language);
  setStatus("Ready.");
  refreshMemoryLists();
}

async function sendAudio(blob) {
  setStatus("2 · Speech-to-text — turning your voice into words…");
  const wav = await blobToWav(blob);
  const cid = await ensureConversation();
  const formData = new FormData();
  formData.append("audio", wav, "speech.wav");
  formData.append("language", languageSelect.value);
  formData.append("conversation_id", cid);
  const res = await fetch("/api/talk", { method: "POST", body: formData });
  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok) {
    setStatus(data.detail || "Could not understand that. Try again.");
    return;
  }
  rememberConversation(data);
  history.push({ role: "user", content: data.transcript });
  history.push({ role: "assistant", content: data.reply });
  addBubble("user", data.transcript, "You · " + data.language);
  addBubble("bot", data.reply, "Lentswe", data.sources);
  if (data.active === false) {
    setStatus("This chat session has ended. Start a new chat.");
    return;
  }
  if (isQuiet(data.transcript)) {
    stopSpeech();
    setStatus("Ready.");
    return;
  }
  setStatus("5 · Speaking — Lentswe is answering…");
  await maybeSpeak(speakable(data.reply), data.language);
  setStatus("Ready.");
  refreshMemoryLists();
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = function (event) {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.onstop = async function () {
    stream.getTracks().forEach(function (track) {
      track.stop();
    });
    const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
    try {
      await sendAudio(blob);
    } catch (err) {
      setStatus(err.message || "Recording failed.");
    }
  };
  recorder.start();
  recording = true;
  micButton.classList.add("hot");
  micButton.setAttribute("aria-pressed", "true");
  startRecTimer();
  setStatus("1 · Capture — listening. Click the mic again when you finish.");
}

function stopRecording() {
  if (!recording || !recorder) return;
  recording = false;
  micButton.classList.remove("hot");
  micButton.setAttribute("aria-pressed", "false");
  stopRecTimer();
  recorder.stop();
}

let recStarted = 0;
let recTick = 0;

function startRecTimer() {
  const el = document.getElementById("rec-timer");
  recStarted = Date.now();
  if (el) el.hidden = false;
  stopRecTimer();
  recTick = setInterval(function () {
    const sec = Math.floor((Date.now() - recStarted) / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    if (el) el.textContent = mm + ":" + ss;
  }, 250);
}

function stopRecTimer() {
  if (recTick) clearInterval(recTick);
  recTick = 0;
  const el = document.getElementById("rec-timer");
  if (el) {
    el.hidden = true;
    el.textContent = "00:00";
  }
}

async function hearLentswe(text, language) {
  languageSelect.value = language;
  updateSpokenHint();
  await maybeSpeak(text, language);
}

function renderGreetingChips() {
  const wrap = document.getElementById("greet-chips");
  if (!wrap) return;
  for (const item of JABU_GREETINGS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML =
      "<span class=\"word\">" + item.word + "</span><span class=\"lang\">" + item.langLabel + "</span>";
    btn.addEventListener("click", function () {
      languageSelect.value = item.lang;
      updateSpokenHint();
      sendText(item.say);
    });
    wrap.appendChild(btn);
  }
}

loadLanguages()
  .then(function () {
    renderGreetingChips();
    return restoreConversation();
  })
  .catch(function () {
    setStatus("Could not load languages.");
  });

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  const text = textInput.value.trim();
  if (!text) return;
  textInput.value = "";
  await sendText(text);
});

micButton.addEventListener("click", function (event) {
  event.preventDefault();
  if (recording) {
    stopRecording();
  } else {
    startRecording().catch(function (err) {
      setStatus(err.message);
    });
  }
});

languageSelect.addEventListener("change", updateSpokenHint);
stopSpeechBtn?.addEventListener("click", stopSpeech);
document.getElementById("new-chat")?.addEventListener("click", function () {
  startNewChat().catch(function (err) {
    setStatus(err.message || "Could not start a new chat.");
  });
});

document.getElementById("play-all")?.addEventListener("click", async function () {
  setStatus("Lentswe is speaking the 11 greetings…");
  for (const item of JABU_GREETINGS) {
    await hearLentswe(item.say, item.lang);
  }
  setStatus("Ready.");
});

const TASK_KEY = "lentswe-tasks";
const GOAL_KEY = "lentswe-goals";

function loadItems(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (err) {
    return [];
  }
}

function saveItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function renderList(key, ulId) {
  const ul = document.getElementById(ulId);
  if (!ul) return;
  const items = loadItems(key);
  ul.innerHTML = "";
  items.forEach(function (item) {
    const label = typeof item === "string" ? item : item.description || item.goal || "";
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(label));
    if (key === TASK_KEY) {
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Done";
      del.addEventListener("click", function () {
        sendText("mark " + label + " as done");
      });
      li.appendChild(del);
    }
    ul.appendChild(li);
  });
}

async function refreshMemoryLists() {
  try {
    const res = await fetch("/api/memory");
    if (!res.ok) return;
    const data = await res.json();
    const tasks = (data.tasks || []).filter(function (t) { return !t.done; }).map(function (t) { return t.description; });
    const goals = (data.goals || []).map(function (g) { return g.goal; });
    saveItems(TASK_KEY, tasks);
    saveItems(GOAL_KEY, goals);
    renderList(TASK_KEY, "task-list");
    renderList(GOAL_KEY, "goal-list");
  } catch (err) {
    return;
  }
  refreshKnowledgeList();
}

async function refreshKnowledgeList() {
  const ul = document.getElementById("teach-list");
  const hint = document.getElementById("teach-saved");
  if (!ul) return;
  try {
    const res = await fetch("/api/knowledge");
    if (!res.ok) return;
    const data = await res.json();
    const rows = data.questions || [];
    ul.innerHTML = "";
    if (hint) {
      hint.textContent = rows.length
        ? rows.length + " taught repl" + (rows.length === 1 ? "y" : "ies") + " in knowledge_base.json. Survives New chat."
        : "No taught replies yet. Ask something she does not know, or use the form.";
    }
    rows.forEach(function (row) {
      const li = document.createElement("li");
      const pair = document.createElement("div");
      pair.className = "teach-pair";
      const q = document.createElement("strong");
      q.textContent = row.question || "";
      const a = document.createElement("span");
      a.textContent = row.answer || "";
      pair.appendChild(q);
      pair.appendChild(a);
      li.appendChild(pair);
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Forget";
      del.addEventListener("click", function () {
        fetch("/api/knowledge/" + encodeURIComponent(row.id), { method: "DELETE" })
          .then(function () {
            refreshKnowledgeList();
          })
          .catch(function () {
            setStatus("Could not forget that reply.");
          });
      });
      li.appendChild(del);
      ul.appendChild(li);
    });
  } catch (err) {
    return;
  }
}

function badgeLabel(item) {
  if (item && item.live) return "ready";
  if (item && item.ready) return "packed";
  return "missing";
}

function renderDeployCard(item) {
  const card = document.createElement("article");
  card.className = "deploy-card";
  card.setAttribute("data-platform", item.id);

  const role = document.createElement("p");
  role.className = "role";
  role.textContent = item.role || "";
  card.appendChild(role);

  const title = document.createElement("h4");
  title.textContent = item.name || item.id;
  card.appendChild(title);

  const how = document.createElement("p");
  how.textContent = item.how || "";
  card.appendChild(how);

  const meta = document.createElement("p");
  meta.className = "deploy-meta";
  const cmd = document.createElement("code");
  cmd.textContent = item.command || "";
  meta.appendChild(cmd);
  card.appendChild(meta);

  const row = document.createElement("div");
  row.className = "mini-form";
  const badge = document.createElement("span");
  badge.className = "badge " + (item.live ? "ready" : "blocked");
  badge.textContent = badgeLabel(item);
  row.appendChild(badge);

  const action = document.createElement("button");
  action.type = "button";
  action.textContent = item.id === "docker" ? "Pack" : item.id === "vercel" ? "Prepare host" : "Check UI";
  action.addEventListener("click", function () {
    packPlatform(item.id);
  });
  row.appendChild(action);
  card.appendChild(row);
  return card;
}

async function packPlatform(platformId) {
  setStatus("Working on " + platformId + "…");
  try {
    const res = await fetch("/api/deploy/" + encodeURIComponent(platformId), { method: "POST" });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      setStatus(data.detail || "Could not pack that platform.");
      return;
    }
    await refreshDeploy();
    setStatus(data.detail || data.action || ("Packed " + platformId));
  } catch (err) {
    setStatus("Could not reach the deploy API.");
  }
}

async function refreshDocs() {
  const list = document.getElementById("docs-list");
  const summary = document.getElementById("docs-summary");
  if (!list) return;
  try {
    const res = await fetch("/api/docs");
    if (!res.ok) return;
    const data = await res.json();
    const files = data.files || [];
    if (summary) {
      summary.textContent = files.length
        ? files.length + " file" + (files.length === 1 ? "" : "s") + ", " +
          (data.chunk_count || 0) + " chunks on disk. No cloud embedding key."
        : "No business files yet. Drop .md, .txt, or .pdf into docs/business/.";
    }
    list.innerHTML = "";
    files.forEach(function (row) {
      const li = document.createElement("li");
      const pair = document.createElement("div");
      pair.className = "teach-pair";
      const name = document.createElement("strong");
      name.textContent = row.name || "";
      const meta = document.createElement("span");
      meta.textContent = (row.chunks || 0) + " chunk" + (row.chunks === 1 ? "" : "s");
      pair.appendChild(name);
      pair.appendChild(meta);
      li.appendChild(pair);
      list.appendChild(li);
    });
  } catch (err) {
    if (summary) summary.textContent = "Could not load the document index.";
  }
}

async function rebuildDocs() {
  setStatus("Rebuilding the document index…");
  try {
    const res = await fetch("/api/docs/reindex", { method: "POST" });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      setStatus(data.detail || "Could not rebuild the index.");
      return;
    }
    await refreshDocs();
    setStatus("Indexed " + (data.chunk_count || 0) + " chunks from " + (data.file_count || 0) + " file(s).");
  } catch (err) {
    setStatus("Could not reach the docs API.");
  }
}

document.getElementById("docs-reindex")?.addEventListener("click", function () {
  rebuildDocs();
});

document.getElementById("docs-upload-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const input = document.getElementById("docs-file");
  const file = input && input.files && input.files[0];
  if (!file) {
    setStatus("Choose a .md, .txt, or .pdf file first.");
    return;
  }
  const body = new FormData();
  body.append("file", file, file.name);
  const res = await fetch("/api/docs/upload", { method: "POST", body: body });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Could not add that file.");
    return;
  }
  if (input) input.value = "";
  await refreshDocs();
    setStatus("Added " + (data.name || file.name) + " and rebuilt the index.");
    refreshDesk();
});

async function refreshDeploy() {
  const grid = document.getElementById("deploy-teach");
  const wired = document.getElementById("deploy-wired");
  const summary = document.getElementById("deploy-summary");
  const blockedEl = document.getElementById("deploy-blocked");
  if (!grid) return;
  try {
    const res = await fetch("/api/deploy");
    if (!res.ok) return;
    const data = await res.json();
    if (summary) summary.textContent = data.summary || "";
    grid.innerHTML = "";
    (data.teach || []).forEach(function (item) {
      grid.appendChild(renderDeployCard(item));
    });
    if (wired) {
      wired.innerHTML = "";
      (data.wired || []).forEach(function (item) {
        const li = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = item.name + " · " + (item.role || "");
        const badge = document.createElement("span");
        badge.className = "badge " + (item.live ? "ready" : "blocked");
        badge.textContent = item.live ? "wired" : (item.blocked && item.blocked.length ? "needs secrets" : "packed");
        li.appendChild(label);
        li.appendChild(badge);
        wired.appendChild(li);
      });
    }
    const blocked = data.blocked || [];
    if (blockedEl) {
      const teachBlocked = blocked.filter(function (row) {
        return row.platform === "streamlit" || row.platform === "docker" || row.platform === "vercel";
      });
      blockedEl.textContent = teachBlocked.length
        ? "Blocked for live run: " + teachBlocked.map(function (row) { return row.platform + " (" + row.reason + ")"; }).join(" · ")
        : "Streamlit, Docker config, and Vercel config are packed on this machine.";
    }
  } catch (err) {
    if (summary) summary.textContent = "Could not load deploy status.";
  }
}

function addItem(key, ulId, value) {
  const text = (value || "").trim();
  if (!text) return false;
  const items = loadItems(key);
  items.push(text);
  saveItems(key, items);
  renderList(key, ulId);
  return true;
}

function handleLocalLists(text) {
  return false;
}

function openSkill(name) {
  const panel = document.getElementById("skill-panel");
  const buttons = document.querySelectorAll(".skill-row [data-skill]");
  buttons.forEach(function (btn) {
    btn.setAttribute("aria-pressed", btn.getAttribute("data-skill") === name ? "true" : "false");
  });
  panel.hidden = false;
  document.querySelectorAll(".skill-view").forEach(function (view) {
    view.hidden = view.getAttribute("data-view") !== name;
  });
  if (name === "teach") refreshKnowledgeList();
  if (name === "docs") refreshDocs();
  if (name === "desk") refreshDesk();
  if (name === "deploy") refreshDeploy();
  if (name === "tasks" || name === "goals") refreshMemoryLists();
}

document.querySelectorAll(".skill-row [data-skill]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    openSkill(btn.getAttribute("data-skill"));
  });
});

document.querySelectorAll(".ask").forEach(function (btn) {
  btn.addEventListener("click", function () {
    sendText(btn.getAttribute("data-ask"));
  });
});

document.getElementById("task-form")?.addEventListener("submit", function (event) {
  event.preventDefault();
  const input = document.getElementById("task-input");
  const value = (input.value || "").trim();
  if (!value) return;
  input.value = "";
  sendText("add to my list " + value);
});

document.getElementById("goal-form")?.addEventListener("submit", function (event) {
  event.preventDefault();
  const input = document.getElementById("goal-input");
  const value = (input.value || "").trim();
  if (!value) return;
  input.value = "";
  sendText("my goal is " + value);
});

document.getElementById("teach-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const qEl = document.getElementById("teach-question");
  const aEl = document.getElementById("teach-answer");
  const question = (qEl && qEl.value || "").trim();
  const answer = (aEl && aEl.value || "").trim();
  if (!question || !answer) {
    setStatus("Type both a phrase and a reply.");
    return;
  }
  const res = await fetch("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: question, answer: answer }),
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Could not save that reply.");
    return;
  }
  if (qEl) qEl.value = "";
  if (aEl) aEl.value = "";
  await refreshKnowledgeList();
  setStatus("Learned: “" + question + "” → “" + answer + "”");
});

function bindA11y(id, className) {
  const box = document.getElementById(id);
  if (!box) return;
  const key = "lentswe-" + className;
  box.checked = localStorage.getItem(key) === "1";
  document.body.classList.toggle(className, box.checked);
  box.addEventListener("change", function () {
    document.body.classList.toggle(className, box.checked);
    localStorage.setItem(key, box.checked ? "1" : "0");
  });
}

bindA11y("a11y-large", "large-text");
bindA11y("a11y-contrast", "high-contrast");
bindA11y("a11y-motion", "reduce-motion");
renderList(TASK_KEY, "task-list");
renderList(GOAL_KEY, "goal-list");
refreshMemoryLists();

const HOME_KEY = "lentswe-home";

function showHomeSaved() {
  const el = document.getElementById("home-saved");
  const input = document.getElementById("home-input");
  if (!el) return;
  const addr = (localStorage.getItem(HOME_KEY) || "").trim();
  el.textContent = addr ? "Saved home: " + addr : "No home saved yet.";
  if (input && addr) input.value = addr;
}

document.getElementById("home-form")?.addEventListener("submit", function (event) {
  event.preventDefault();
  const input = document.getElementById("home-input");
  const value = (input && input.value || "").trim();
  if (!value) {
    setStatus("Type a home address first.");
    return;
  }
  localStorage.setItem(HOME_KEY, value);
  showHomeSaved();
  setStatus("Home address saved on this device.");
  pinHomeMap();
});

async function pinHomeMap() {
  const addr = (localStorage.getItem(HOME_KEY) || "").trim();
  const frame = document.getElementById("home-map");
  if (!addr || !frame) {
    setStatus("Save a home address first.");
    return;
  }
  const res = await fetch("/api/geocode?q=" + encodeURIComponent(addr));
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Could not pin that address.");
    return;
  }
  frame.src = data.embed;
  frame.hidden = false;
  setStatus("Map pin is OpenStreetMap.");
}

function guideMeHome() {
  const dest = (localStorage.getItem(HOME_KEY) || "").trim();
  if (!dest) {
    setStatus("Save a home address first.");
    return;
  }
  setStatus("Asking for your location once, to start the route…");
  const openMaps = function (origin) {
    let url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(dest) + "&travelmode=driving";
    if (origin) url += "&origin=" + encodeURIComponent(origin);
    window.open(url, "_blank", "noopener");
  };
  if (!navigator.geolocation) {
    openMaps("");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      openMaps(pos.coords.latitude + "," + pos.coords.longitude);
      setStatus("Maps opened for directions home.");
    },
    function () {
      openMaps("");
      setStatus("No GPS. Maps opened with your home pin only.");
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

document.getElementById("home-show-map")?.addEventListener("click", pinHomeMap);
document.getElementById("home-guide")?.addEventListener("click", guideMeHome);
showHomeSaved();

const SPOTIFY_KEY = "lentswe-spotify";

function spotifyEmbedUrl(raw) {
  const text = (raw || "").trim();
  let match = text.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist)\/([a-zA-Z0-9]+)/i);
  if (!match) match = text.match(/^spotify:(playlist|album|track|artist):([a-zA-Z0-9]+)/i);
  if (!match) return null;
  return "https://open.spotify.com/embed/" + match[1] + "/" + match[2];
}

function showSpotifyEmbed() {
  const frame = document.getElementById("spotify-frame");
  const hint = document.getElementById("spotify-saved");
  const input = document.getElementById("spotify-input");
  if (!frame || !hint) return;
  const saved = (localStorage.getItem(SPOTIFY_KEY) || "").trim();
  if (input && saved) input.value = saved;
  const embed = spotifyEmbedUrl(saved);
  if (!embed) {
    frame.hidden = true;
    frame.removeAttribute("src");
    hint.textContent = saved
      ? "That does not look like a Spotify playlist, album, track, or artist link."
      : "No Spotify link saved in this browser yet.";
    return;
  }
  frame.src = embed;
  frame.hidden = false;
  hint.textContent = "Embed saved in this browser only. Playback uses Spotify’s player.";
}

document.getElementById("spotify-form")?.addEventListener("submit", function (event) {
  event.preventDefault();
  const value = (document.getElementById("spotify-input")?.value || "").trim();
  if (!spotifyEmbedUrl(value)) {
    setStatus("Paste a full Spotify playlist, album, track, or artist URL.");
    return;
  }
  localStorage.setItem(SPOTIFY_KEY, value);
  showSpotifyEmbed();
  setStatus("Spotify embed saved.");
});

showSpotifyEmbed();

document.getElementById("ytm-form")?.addEventListener("submit", function (event) {
  event.preventDefault();
  const q = (document.getElementById("ytm-input")?.value || "").trim();
  if (!q) {
    window.open("https://music.youtube.com/", "_blank", "noopener");
    setStatus("Opened YouTube Music.");
    return;
  }
  window.open("https://music.youtube.com/search?q=" + encodeURIComponent(q), "_blank", "noopener");
  setStatus("Opened YouTube Music search.");
});

document.getElementById("music-open-spotify")?.addEventListener("click", function () {
  const saved = (localStorage.getItem(SPOTIFY_KEY) || "").trim();
  window.open(saved || "https://open.spotify.com/", "_blank", "noopener");
});

document.getElementById("music-open-ytm")?.addEventListener("click", function () {
  window.open("https://music.youtube.com/", "_blank", "noopener");
});

async function checkReminders() {
  try {
    const res = await fetch("/api/reminders/due");
    if (!res.ok) return;
    const data = await res.json();
    const rows = data.reminders || [];
    const language = languageSelect.value === "auto" ? "english" : languageSelect.value;
    for (let i = 0; i < rows.length; i++) {
      const line = "Reminder: " + (rows[i].text || "time is up");
      addBubble("bot", line, "Lentswe");
      history.push({ role: "assistant", content: line });
      if (conversationId) {
        await fetch("/api/conversations/" + encodeURIComponent(conversationId) + "/turns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", content: line }),
        }).catch(function () {
          return null;
        });
      }
      setStatus("Reminder.");
      await maybeSpeak(line, language);
    }
  } catch (err) {
    return;
  }
}

setInterval(checkReminders, 5000);

const ROLE_KEY = "lentswe-role";

function currentRole() {
  return localStorage.getItem(ROLE_KEY) || "guest";
}

function setRole(role) {
  localStorage.setItem(ROLE_KEY, role);
  const line = document.getElementById("online-line");
  if (line) line.textContent = "Online · " + role;
}

setRole(currentRole());

document.getElementById("share-chat")?.addEventListener("click", async function () {
  const cid = conversationId || (await ensureConversation());
  const res = await fetch("/api/conversations/" + encodeURIComponent(cid) + "/share");
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Could not share this chat.");
    return;
  }
  const text = data.text || "";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    setStatus("Copied this chat. Paste it where you want.");
    return;
  }
  setStatus(text.slice(0, 120));
});

document.getElementById("assistant-mode")?.addEventListener("change", async function (event) {
  await fetch("/api/desk/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assistant_mode: event.target.value }),
  });
  setStatus("Assistant mode saved.");
});

function openDeskPane(name) {
  document.querySelectorAll(".desk-nav [data-desk]").forEach(function (btn) {
    btn.setAttribute("aria-pressed", btn.getAttribute("data-desk") === name ? "true" : "false");
  });
  document.querySelectorAll(".desk-pane").forEach(function (pane) {
    pane.hidden = pane.getAttribute("data-desk-pane") !== name;
  });
}

document.querySelectorAll(".desk-nav [data-desk]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    openDeskPane(btn.getAttribute("data-desk"));
  });
});

function drawSpark(values) {
  const svg = document.getElementById("desk-spark");
  if (!svg) return;
  const nums = values && values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max.apply(null, nums.concat([1]));
  const points = nums.map(function (n, i) {
    const x = (i / Math.max(nums.length - 1, 1)) * 140;
    const y = 34 - (n / max) * 30;
    return x + "," + y;
  }).join(" ");
  svg.innerHTML = '<polyline fill="none" stroke="#4a6b5c" stroke-width="2" points="' + points + '"/>';
}

async function uploadKnowledge(file) {
  if (!file) {
    setStatus("Choose a .md, .txt, .pdf, or .docx file first.");
    return;
  }
  const body = new FormData();
  body.append("file", file, file.name);
  const res = await fetch("/api/docs/upload", { method: "POST", body: body });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Could not add that file.");
    return;
  }
  await refreshDocs();
  await refreshDesk();
  setStatus("Added " + (data.name || file.name) + " and rebuilt the index.");
}

document.getElementById("desk-upload-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const input = document.getElementById("desk-file");
  await uploadKnowledge(input && input.files && input.files[0]);
  if (input) input.value = "";
});

const drop = document.getElementById("desk-drop");
if (drop) {
  ["dragenter", "dragover"].forEach(function (name) {
    drop.addEventListener(name, function (event) {
      event.preventDefault();
      drop.classList.add("hot");
    });
  });
  ["dragleave", "drop"].forEach(function (name) {
    drop.addEventListener(name, function (event) {
      event.preventDefault();
      drop.classList.remove("hot");
    });
  });
  drop.addEventListener("drop", function (event) {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    uploadKnowledge(file);
  });
}

document.getElementById("staff-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: document.getElementById("staff-user")?.value || "staff",
      pin: document.getElementById("staff-pin")?.value || "",
    }),
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Staff pin did not match.");
    return;
  }
  setRole(data.role || "staff");
  const line = document.getElementById("staff-line");
  if (line) line.textContent = "Signed in as " + (data.username || "staff") + ".";
  setStatus("Staff desk unlocked.");
});

document.getElementById("desk-docs")?.addEventListener("click", function () {
  openSkill("docs");
});
document.getElementById("desk-example")?.addEventListener("click", function () {
  sendText("how much is the mutton bunny chow?");
});
document.getElementById("desk-tutorial")?.addEventListener("click", function () {
  sendText("watch tutorial");
});

document.getElementById("inbox-search")?.addEventListener("submit", function (event) {
  event.preventDefault();
  refreshInbox(document.getElementById("inbox-query")?.value || "");
});

async function refreshInbox(query) {
  const ul = document.getElementById("inbox-list");
  if (!ul) return;
  const res = await fetch("/api/conversations?q=" + encodeURIComponent(query || ""));
  const data = await res.json().catch(function () { return {}; });
  ul.innerHTML = "";
  (data.conversations || []).forEach(function (row) {
    const li = document.createElement("li");
    const pair = document.createElement("div");
    pair.className = "teach-pair";
    const title = document.createElement("strong");
    title.textContent = row.preview || row.conversation_id;
    const meta = document.createElement("span");
    meta.textContent = (row.active ? "active" : "ended") + " · " + (row.turn_count || 0) + " turns";
    pair.appendChild(title);
    pair.appendChild(meta);
    li.appendChild(pair);
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "Open";
    open.addEventListener("click", function () {
      sessionStorage.setItem(CONVO_KEY, row.conversation_id);
      conversationId = row.conversation_id;
      history.length = 0;
      showEmpty();
      restoreConversation();
    });
    li.appendChild(open);
    ul.appendChild(li);
  });
}

document.getElementById("lead-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const name = document.getElementById("lead-name")?.value || "";
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      phone: document.getElementById("lead-phone")?.value || "",
      email: document.getElementById("lead-email")?.value || "",
      conversation_id: conversationId,
    }),
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Need a lead name.");
    return;
  }
  setStatus("Captured lead " + data.name + ".");
  refreshDesk();
});

document.getElementById("book-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: document.getElementById("book-name")?.value || "",
      slot: document.getElementById("book-slot")?.value || "",
    }),
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Need a booking name.");
    return;
  }
  setStatus("Held " + data.slot + " for " + data.name + ".");
  refreshDesk();
});

document.getElementById("follow-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const res = await fetch("/api/followups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: document.getElementById("follow-to")?.value || "",
      body: document.getElementById("follow-body")?.value || "",
    }),
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "Need an email and a message.");
    return;
  }
  setStatus("Draft follow-up waiting. Confirm before send.");
  refreshDesk();
});

document.getElementById("follow-send")?.addEventListener("click", async function () {
  const res = await fetch("/api/followups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true }),
  });
  const data = await res.json().catch(function () { return {}; });
  setStatus(data.result || data.detail || "Follow-up update.");
  refreshDesk();
});

document.getElementById("quote-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const res = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: document.getElementById("quote-query")?.value || "" }),
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    setStatus(data.detail || "No matching price.");
    return;
  }
  const first = (data.lines || [])[0] || {};
  setStatus("Draft quote " + (first.item || "") + " " + (first.price || "") + ".");
  refreshDesk();
});

document.getElementById("ai-settings")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const res = await fetch("/api/desk/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tone: document.getElementById("set-tone")?.value,
      safety: document.getElementById("set-safety")?.value,
      creativity: document.getElementById("set-creativity")?.value,
    }),
  });
  const data = await res.json().catch(function () { return {}; });
  const hint = document.getElementById("settings-saved");
  if (hint) hint.textContent = "Saved tone " + (data.tone || "") + ", safety " + (data.safety || "") + ".";
  setStatus("AI settings saved on this computer.");
});

document.getElementById("set-creativity")?.addEventListener("input", function (event) {
  const label = document.getElementById("set-creativity-label");
  if (label) label.textContent = event.target.value + "%";
});

document.getElementById("card-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: document.getElementById("card-title")?.value || "Lentswe",
      ratio: document.getElementById("card-ratio")?.value || "1:1",
    }),
  });
  const data = await res.json().catch(function () { return {}; });
  const box = document.getElementById("card-preview");
  if (box && data.id) box.innerHTML = '<img alt="Lentswe card" src="/api/cards/' + data.id + '.svg" />';
  setStatus("Made a local card. No image cloud.");
});

document.getElementById("translate-form")?.addEventListener("submit", async function (event) {
  event.preventDefault();
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: document.getElementById("translate-text")?.value || "hello",
      language: document.getElementById("translate-lang")?.value || "zulu",
    }),
  });
  const data = await res.json().catch(function () { return {}; });
  const line = document.getElementById("studio-line");
  if (line) line.textContent = data.translation || data.detail || "Could not translate.";
});

document.getElementById("copy-snippet")?.addEventListener("click", async function () {
  const text = document.getElementById("desk-snippet")?.textContent || "";
  if (navigator.clipboard && text) {
    await navigator.clipboard.writeText(text);
    setStatus("Embed snippet copied.");
  }
});

async function refreshDesk() {
  const res = await fetch("/api/desk");
  if (!res.ok) return;
  const data = await res.json();
  const stats = data.analytics || {};
  const acc = document.getElementById("desk-accuracy");
  const delta = document.getElementById("desk-delta");
  if (acc) acc.textContent = (stats.accuracy != null ? stats.accuracy : "—") + "%";
  if (delta) {
    const sign = stats.delta > 0 ? "+" : "";
    delta.textContent = sign + (stats.delta || 0) + "% vs last week · " + (stats.turns_this_week || 0) + " turns";
  }
  drawSpark(stats.spark || []);
  const sources = document.getElementById("desk-sources");
  if (sources) {
    const docs = await fetch("/api/docs").then(function (r) { return r.json(); }).catch(function () { return {}; });
    sources.innerHTML = "";
    (docs.files || []).forEach(function (row) {
      const li = document.createElement("li");
      li.textContent = (row.name || "") + " · " + (row.chunks || 0) + " chunks";
      sources.appendChild(li);
    });
  }
  const settings = data.settings || {};
  const tone = document.getElementById("set-tone");
  const safety = document.getElementById("set-safety");
  const creat = document.getElementById("set-creativity");
  const creatLabel = document.getElementById("set-creativity-label");
  const mode = document.getElementById("assistant-mode");
  if (tone && settings.tone) tone.value = settings.tone;
  if (safety && settings.safety) safety.value = settings.safety;
  if (creat && settings.creativity != null) creat.value = settings.creativity;
  if (creatLabel && settings.creativity != null) creatLabel.textContent = settings.creativity + "%";
  if (mode && settings.assistant_mode) mode.value = settings.assistant_mode;
  const flows = document.getElementById("flow-toggles");
  if (flows) {
    flows.innerHTML = "";
    const names = {
      auto_responses: "Auto-responses (Teach)",
      smart_routing: "Smart routing (handoff)",
      lead_capture: "Lead capture",
      follow_up: "Follow-up email (confirm)",
    };
    Object.keys(names).forEach(function (key) {
      const label = document.createElement("label");
      label.className = "toggle";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = !!(data.workflows && data.workflows[key]);
      box.addEventListener("change", function () {
        const body = {};
        body[key] = box.checked;
        fetch("/api/desk/workflows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      });
      label.appendChild(box);
      label.appendChild(document.createTextNode(names[key]));
      flows.appendChild(label);
    });
  }
  const slot = document.getElementById("book-slot");
  if (slot) {
    slot.innerHTML = "";
    (data.slots || []).forEach(function (row) {
      const opt = document.createElement("option");
      opt.value = row.label;
      opt.textContent = row.label;
      slot.appendChild(opt);
    });
  }
  const flowList = document.getElementById("flow-list");
  if (flowList) {
    flowList.innerHTML = "";
    (data.leads || []).forEach(function (row) {
      const li = document.createElement("li");
      li.textContent = "Lead · " + row.name + (row.email ? " · " + row.email : "");
      flowList.appendChild(li);
    });
    (data.bookings || []).forEach(function (row) {
      const li = document.createElement("li");
      li.textContent = "Hold · " + row.name + " · " + row.slot;
      flowList.appendChild(li);
    });
    (data.handoffs || []).forEach(function (row) {
      const li = document.createElement("li");
      li.textContent = "Handoff · " + row.id + " · " + (row.reason || "");
      flowList.appendChild(li);
    });
  }
  const grid = document.getElementById("desk-integrations");
  if (grid) {
    grid.innerHTML = "";
    (data.integrations || []).forEach(function (item) {
      const card = document.createElement("article");
      card.className = "deploy-card";
      card.innerHTML = "<p class=\"role\">" + (item.ready ? "ready" : "blocked") + "</p><h4>" + item.name + "</h4><p>" + (item.how || "") + "</p>";
      grid.appendChild(card);
    });
  }
  const snippet = document.getElementById("desk-snippet");
  const site = (data.integrations || []).find(function (row) { return row.id === "website"; });
  if (snippet && site) snippet.textContent = site.snippet || "";
  const trust = document.getElementById("desk-trust");
  if (trust) {
    trust.innerHTML = "";
    (data.trust || []).forEach(function (row) {
      const span = document.createElement("span");
      span.textContent = row.label;
      span.title = row.detail || "";
      trust.appendChild(span);
    });
  }
  refreshInbox("");
}

