const form = document.getElementById("type-form");
const input = document.getElementById("text-input");
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const history = [];
let conversationId = "";

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

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  const text = (input.value || "").trim();
  if (!text) return;
  input.value = "";
  addBubble("user", text, "You");
  statusEl.textContent = "Thinking…";
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, language: "english", conversation_id: conversationId }),
  });
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    statusEl.textContent = data.detail || "Chat failed.";
    return;
  }
  conversationId = data.conversation_id || conversationId;
  addBubble("bot", data.reply, "Lentswe", data.sources);
  statusEl.textContent = "Ready.";
});
