# Lentswe

South African **voice assistant** for all **11 official languages**. Speak or type. Lentswe greets you with public words (Sawubona, Molo, Dumela, Avuxeni, …) and answers in the language you pick.

Spoken audio uses **synthetic TTS** (Microsoft, Google, or a multilingual neural voice). This project does **not** copy YouTube recordings or clone other people’s voices.

## Run (voice in the browser)

```powershell
cd C:\Users\Sivuz\voice-assistant
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open [http://127.0.0.1:7000](http://127.0.0.1:7000) — not `/api/chat` (that URL is POST-only).

You need internet for speech-to-text (`*-ZA` locales) and for most TTS. If Edge/Google fail, English/Afrikaans can fall back to **pyttsx3** (Windows SAPI) with no extra API key.

## Optional smarter chat (Groq + tools)

Copy `.env.example` to `.env`. Get a key at [https://console.groq.com/keys](https://console.groq.com/keys) and set:

```
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
CHAT_MODEL=openai/gpt-oss-20b
```

Save the file and restart `app.py`. This is **not** Anthropic/Claude. Groq is OpenAI-compatible, so the same `openai` Python package works.

Optional driving distance/time (OpenRouteService, free key at [https://openrouteservice.org](https://openrouteservice.org)):

```
ORS_API_KEY=
```

Without `ORS_API_KEY`, weather, tasks, goals, health, and the Home tab still work. Directions in chat will ask you to set the key.

Optional **test email** (Python `smtplib`). A dummy/school mailbox is enough. If these are empty, Lentswe will not claim the mail was sent:

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

Text-only loop (same memory + tools, no mic):

```powershell
python -m src.assistant
```



## What you can do

- Greetings in 11 languages (click-to-talk mic, not always-on listening)
- Live weather from **Open-Meteo** (“weather in Cape Town”) — numbers are never invented (no OpenWeatherMap key)
- Tasks, goals, timed reminders, symptom diary, and profile facts in `data/lentswe.json` (survives restart)
- Custom phrases in `config/commands.json` (open a URL or speak a fixed line)
- Browser search via Python `webbrowser` (“search Google for …”)
- Optional SMTP test mail (“send an email to test@example.com saying hello”)
- Spoken time and date (“what time is it”, “what date is it”)
- SA emergency numbers and SADAG (not a doctor; cannot call the police or send SMS)
- Home address in **this browser** only; GPS only when you tap Guide me home
- Travel talk and optional OpenRouteService driving summary
- Learning drills (“teach me isiXhosa”)
- Accessibility: larger text, contrast, reduce motion
- **No smart-home hardware** — “turn on the lights” is an honest spoken reply, not a switch

**Voices (synthetic, not YouTube clones):**

- **Microsoft Edge:** English (SA), Afrikaans, isiZulu
- **UBC Simba-TTS** (local VITS, first play downloads the model): isiXhosa, Sesotho, Setswana; Afrikaans if Edge is down
- **Meta MMS:** Xitsonga (`facebook/mms-tts-tso`)
- **Not on the Hub yet:** Sepedi, siSwati, Tshivenda, isiNdebele — those still use a multilingual fallback so the app is not silent

`torch` + `transformers` must work on this PC for Simba/MMS. If Windows Application Control blocks them, Edge/Google still run.

## How the pieces fit (memory, personality, cross-domain)


| File               | Role                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| `src/store.py`     | Writes `data/lentswe.json` after every task/goal/symptom/profile change |
| `src/memory.py`    | Session chat plus a snapshot injected into every Groq request           |
| `src/mms_tts.py`   | Local Simba / MMS VITS voices                                           |
| `src/weather.py`   | Open-Meteo (no API key)                                                 |
| `src/reminders.py` | Timed reminders in JSON; browser speaks them when due                   |
| `src/mail.py`      | Optional `smtplib` test send                                            |
| `src/browse.py`    | Opens a Google search in the default browser                            |
| `src/custom_commands.py` | Phrases from `config/commands.json`                               |
| `src/geo.py`       | Nominatim pin + optional OpenRouteService driving summary               |
| `src/tools.py`     | Keyword tools when Groq is off, or for clear “add to my list…” lines    |
| `src/assistant.py` | Persona, scope, ambiguity, cross-domain rules; Groq function calling    |
| `src/brain.py`     | Wake phrase, safety, then tools or Groq                                 |
| `src/chat.py`      | Calls `chat_turn` when a Groq key is set                                |
| `app.py`           | Flask: page, chat, talk, speak                                          |
| `static/`          | HTML, CSS, JavaScript                                                   |


Edit the `<persona>` block in `src/assistant.py` to change Lentswe’s voice. `<cross_domain_reasoning>` tells the model to weigh weather + goals + health together (try: log a goal and a symptom, then “should I go for a run today”). `<ambiguity>` tells it to ask rather than guess a town.

To add a capability: write a function in `store.py` or `geo.py`, add a matching entry in `TOOL_DEFINITIONS`, and a branch in `execute_tool()`.

## MMS (optional)

`torch` + `transformers` + `scipy` are in `requirements.txt`. On some PCs Windows Application Control blocks those DLLs. Allow them in Windows Security, or skip MMS and keep the other voices.

Never commit `.env`.

## Privacy (what is processed)

Lentswe is a student voice assistant that runs on your PC.

- **Microphone audio** is sent from the browser to this Flask app, then to Google speech-to-text (`*-ZA` locales) so it can turn speech into text. Audio is not stored as files on purpose.

- **Chat text** (typed or transcribed) is processed on this PC. If a Groq key is set, that text is sent to Groq to generate a reply and choose tools.

- **Weather** uses Open-Meteo (live forecast). No OpenWeatherMap key is required.

- **Maps** use OpenStreetMap Nominatim for a home pin. GPS is used only if you tap Guide me home in the browser.

- **Tasks, goals, symptoms, profile** are saved in `data/lentswe.json` on this computer. That file is gitignored.

- **Home address and Spotify link** stay in this browser’s localStorage, not in the JSON file.

- Lentswe does **not** send SMS, call the police, or control a smart home.

- **Email** is sent only if you set `SMTP_*` in `.env` and you ask to send a test message. The password is not written to logs or to `lentswe.json`.