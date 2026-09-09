const languageSelect = document.getElementById("language");
const micButton = document.getElementById("mic");
const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const form = document.getElementById("type-form");
const textInput = document.getElementById("text-input");
const spokenHint = document.getElementById("spoken-hint");
const stopSpeechBtn = document.getElementById("stop-speech");
const emptyState = document.getElementById("empty-state");

const history = [];
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

function hideEmpty() {
  emptyState?.remove();
}

function addBubble(role, text, caption) {
  hideEmpty();
  const div = document.createElement("div");
  div.className = "bubble " + role;
  if (caption) {
    const small = document.createElement("small");
    small.textContent = caption;
    div.appendChild(small);
  }
  div.appendChild(document.createTextNode(text));
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
  spokenHint.textContent = meta.spoken
    ? meta.name + " can speak back as well as show text."
    : meta.name + " replies as text for now — no spoken voice wired yet.";
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
  addBubble("user", text, "You");
  history.push({ role: "user", content: text });
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, language: language, history: history }),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.detail || "Chat failed.");
    return;
  }
  history.push({ role: "assistant", content: data.reply });
  addBubble("bot", data.reply, "Lentswe");
  if (isQuiet(text)) {
    stopSpeech();
    if (recording) stopRecording();
    return;
  }
  await maybeSpeak(speakable(data.reply), data.language || language);
}

async function sendAudio(blob) {
  setStatus("Transcribing…");
  const wav = await blobToWav(blob);
  const formData = new FormData();
  formData.append("audio", wav, "speech.wav");
  formData.append("language", languageSelect.value);
  formData.append("history_json", JSON.stringify(history));
  const res = await fetch("/api/talk", { method: "POST", body: formData });
  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok) {
    setStatus(data.detail || "Could not understand that. Try again.");
    return;
  }
  history.push({ role: "user", content: data.transcript });
  history.push({ role: "assistant", content: data.reply });
  addBubble("user", data.transcript, "You · " + data.language);
  addBubble("bot", data.reply, "Lentswe");
  setStatus("Ready.");
  if (isQuiet(data.transcript)) {
    stopSpeech();
    return;
  }
  await maybeSpeak(speakable(data.reply), data.language);
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
  setStatus("Listening… speak, then click the mic again to send.");
}

function stopRecording() {
  if (!recording || !recorder) return;
  recording = false;
  micButton.classList.remove("hot");
  micButton.setAttribute("aria-pressed", "false");
  recorder.stop();
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
  items.forEach(function (item, index) {
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(item));
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Remove";
    del.addEventListener("click", function () {
      const next = loadItems(key).filter(function (_, i) { return i !== index; });
      saveItems(key, next);
      renderList(key, ulId);
    });
    li.appendChild(del);
    ul.appendChild(li);
  });
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
  const raw = text.trim();
  const lower = raw.toLowerCase();
  let match = raw.match(/^(?:add to (?:my )?(?:list|todo)|add task|remind me to)\s+(.+)/i);
  if (match) {
    addItem(TASK_KEY, "task-list", match[1]);
    addBubble("user", raw, "You");
    addBubble("bot", "Added to your task list: " + match[1], "Lentswe");
    maybeSpeak("Added to your list.", languageSelect.value);
    return true;
  }
  if (/^(what('s| is) on my list|show (my )?(tasks|list)|my tasks)$/i.test(lower)) {
    const items = loadItems(TASK_KEY);
    const reply = items.length ? "Your tasks: " + items.join(". ") : "Your task list is empty.";
    addBubble("user", raw, "You");
    addBubble("bot", reply, "Lentswe");
    maybeSpeak(reply, languageSelect.value);
    return true;
  }
  match = raw.match(/^(?:my goal is|add goal|new goal)\s+(.+)/i);
  if (match) {
    addItem(GOAL_KEY, "goal-list", match[1]);
    addBubble("user", raw, "You");
    addBubble("bot", "Saved goal: " + match[1], "Lentswe");
    maybeSpeak("Goal saved.", languageSelect.value);
    return true;
  }
  if (/^(what are my goals|show (my )?goals|my goals)$/i.test(lower)) {
    const items = loadItems(GOAL_KEY);
    const reply = items.length ? "Your goals: " + items.join(". ") : "You have not saved a goal yet.";
    addBubble("user", raw, "You");
    addBubble("bot", reply, "Lentswe");
    maybeSpeak(reply, languageSelect.value);
    return true;
  }
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
  addItem(TASK_KEY, "task-list", input.value);
  input.value = "";
});

document.getElementById("goal-form")?.addEventListener("submit", function (event) {
  event.preventDefault();
  const input = document.getElementById("goal-input");
  addItem(GOAL_KEY, "goal-list", input.value);
  input.value = "";
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

