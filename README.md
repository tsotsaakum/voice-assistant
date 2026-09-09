# Lentswe

South African **voice assistant** for all **11 official languages**. Speak or type. Lentswe greets you with public words (Sawubona, Molo, Dumela, Avuxeni, …) and answers in the language you pick.

Spoken audio uses **synthetic TTS** (Microsoft, Google, or a multilingual neural voice). This project does **not** copy YouTube recordings or clone other people’s voices.

## Run

```powershell
cd C:\Users\Sivuz\voice-assistant
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:7000

You need internet for speech-to-text (`*-ZA` locales) and for TTS.

## What you can do

- Greetings in 11 languages (mic or type)
- Weather (for example “weather in Cape Town”)
- Travel tips, SA emergency numbers, wellbeing helplines (not a doctor, cannot call the police)
- Tasks and goals stored in this browser only
- Learning drills (“teach me isiXhosa”)
- Accessibility: larger text, contrast, reduce motion

**Voices:** English (SA), Afrikaans, and isiZulu use dedicated neural voices. Other languages use Google where available, then Meta **MMS** if Windows allows `torch`, otherwise a multilingual fallback so the app is not silent.

## Optional smarter chat

Copy `.env.example` to `.env` and add an OpenAI key. Replies then stay in the language you chose. Never commit `.env`.

## Layout

| File | Role |
|------|------|
| `app.py` | Flask: page, chat, talk, speak |
| `src/brain.py` | Routes weather, search, skills, chat |
| `src/skills/` | Travel, safety, health, goals, learning |
| `src/languages.py` | 11 languages, STT, TTS |
| `src/stt.py` | Microphone audio → text |
| `src/chat.py` | Replies |
| `src/tts.py` | Text → speech |
| `src/mms_tts.py` | Optional native-language MMS (needs torch) |
| `static/` | HTML, CSS, JavaScript |

## MMS (optional)

`torch` + `transformers` + `scipy` are in `requirements.txt`. On some PCs Windows Application Control blocks those DLLs. Allow them in Windows Security, or skip MMS and keep the other voices.
