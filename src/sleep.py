"""Sleep logging and simple on-device pattern recognition.

A private sleep diary stored in data/lentswe.json. Lentswe recognises patterns
in what you log — average duration, bedtime regularity, a recent trend, and
short or long nights — and gives gentle, non-medical nudges. It is not a medical
device and does not diagnose sleep disorders.
"""

from __future__ import annotations

import re
import statistics

from src import store

_GOOD = ("great", "good", "well", "deep", "restful", "solid")
_POOR = ("poor", "badly", "terrible", "awful", "restless", "rough", "broken", "interrupted", "bad")
_OKAY = ("okay", "average", "so-so", "so so", "meh")

_QUERY_CUES = (
    "sleep pattern",
    "my sleep",
    "how is my sleep",
    "how's my sleep",
    "how am i sleeping",
    "how did i sleep",
    "sleep summary",
    "sleep report",
    "sleep trend",
    "sleep history",
    "recognise my sleep",
    "recognize my sleep",
    "analyse my sleep",
    "analyze my sleep",
    "show my sleep",
)


def handle_sleep(user_text: str) -> str | None:
    """Log a night or report the pattern. Returns None when not a sleep request."""
    text = (user_text or "").strip()
    if not text:
        return None
    lower = text.lower()
    if "sleep" not in lower and "slept" not in lower:
        return None

    logged = _log_sleep(text, lower)
    if logged:
        return logged

    if any(cue in lower for cue in _QUERY_CUES):
        return recognize_pattern()

    if lower in {"sleep", "log sleep", "log my sleep", "track my sleep"}:
        return _howto()

    return None


def _howto() -> str:
    return (
        "I can keep a private sleep diary on this computer. "
        "Say “log sleep 7 hours”, “I slept from 11pm to 6am”, or add how it felt: "
        "“I slept 6 hours, restless”. Then ask “how is my sleep pattern?”. "
        "I am not a doctor — for ongoing sleep trouble, see a clinician."
    )


def _log_sleep(text: str, lower: str) -> str | None:
    is_log = bool(
        re.search(r"\b(i\s+slept|slept|log(?:ged)?\s+(?:my\s+)?sleep|got\s+[\d.]+\s*(?:hours?|hrs?|h)\b)", lower)
        or re.search(r"\blog\b.*\bsleep\b", lower)
    )
    if not is_log:
        return None

    quality = _detect_quality(lower)
    bedtime_min = waketime_min = None
    hours = None

    rng = re.search(
        r"(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*"
        r"(?:to|until|till|-|–|—)\s*"
        r"(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)",
        lower,
    )
    if rng:
        b = _parse_clock(rng.group(1))
        w = _parse_clock(rng.group(2))
        if b is not None and w is not None:
            bedtime_min, waketime_min = b, w
            dur = (w - b) % (24 * 60)
            if dur == 0:
                dur = 24 * 60
            hours = round(dur / 60.0, 2)

    if hours is None:
        hm = re.search(r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b", lower)
        if hm:
            hours = float(hm.group(1))

    if hours is None:
        return _howto()

    if hours <= 0 or hours > 24:
        return "That sleep length doesn’t look right. Try something like “log sleep 7 hours”."

    item = store.add_sleep(hours, quality=quality, bedtime_min=bedtime_min, waketime_min=waketime_min)
    bits = [_fmt_hours(item["hours"])]
    if bedtime_min is not None and waketime_min is not None:
        bits.append(f"{_fmt_clock(bedtime_min)}–{_fmt_clock(waketime_min)}")
    if quality:
        bits.append(quality)
    tail = recognize_pattern(_prefix="So far, ")
    return f"Logged sleep: {', '.join(bits)}. {tail}"


def recognize_pattern(_prefix: str = "") -> str:
    logs = store.sleep_logs()
    hours = [lg.get("hours") for lg in logs if isinstance(lg.get("hours"), (int, float))]
    if not hours:
        return "No sleep logged yet. Say “log sleep 7 hours” to start your private sleep diary."

    recent_logs = logs[-14:]
    recent = hours[-14:]
    avg = statistics.mean(recent)
    lo, hi = min(recent), max(recent)

    if len(recent) == 1:
        return (
            f"{_prefix}1 night logged: {_fmt_hours(recent[0])}. {_band_note(avg)} "
            "Log a few more nights and I’ll spot your pattern."
        )

    parts = [
        f"{_prefix}over your last {len(recent)} nights you averaged {_fmt_hours(avg)} "
        f"(from {_fmt_hours(lo)} to {_fmt_hours(hi)}).",
        _band_note(avg),
    ]
    trend = _trend(recent)
    if trend:
        parts.append(trend)
    reg = _regularity(recent_logs, recent)
    if reg:
        parts.append(reg)
    qual = _quality_note([lg.get("quality") for lg in recent_logs])
    if qual:
        parts.append(qual)
    parts.append("This is a private, non-medical log — for ongoing sleep trouble, see a clinician.")
    summary = " ".join(p for p in parts if p)
    return summary[0].upper() + summary[1:]


def _band_note(avg: float) -> str:
    if avg < 6:
        return "That’s on the short side; most adults do best with 7–9 hours."
    if avg < 7:
        return "That’s a little below the usual 7–9 hours for adults."
    if avg <= 9:
        return "That sits in the healthy 7–9 hour range for most adults."
    return "That’s longer than the typical 7–9 hours; notice how rested you feel."


def _trend(recent: list[float]) -> str:
    if len(recent) < 4:
        return ""
    half = len(recent) // 2
    first = statistics.mean(recent[:half])
    second = statistics.mean(recent[half:])
    diff = second - first
    if diff >= 0.5:
        return f"Your recent nights are trending up, about {_fmt_hours(abs(diff))} more than earlier."
    if diff <= -0.5:
        return f"Your recent nights are trending down, about {_fmt_hours(abs(diff))} less than earlier."
    return "Your nightly hours have been fairly steady."


def _regularity(recent_logs: list[dict], recent_hours: list[float]) -> str:
    beds = [lg.get("bedtime_min") for lg in recent_logs if isinstance(lg.get("bedtime_min"), int)]
    if len(beds) >= 2:
        norm = [(b + 12 * 60) % (24 * 60) for b in beds]
        spread = statistics.pstdev(norm)
        avg_bed = int((statistics.mean(norm) - 12 * 60) % (24 * 60))
        if spread <= 30:
            return f"Your bedtime is regular, around {_fmt_clock(avg_bed)}."
        if spread <= 60:
            return f"Your bedtime varies a little, around {_fmt_clock(avg_bed)}."
        return (
            f"Your bedtime is irregular (around {_fmt_clock(avg_bed)}, give or take over an hour); "
            "a steadier bedtime tends to help."
        )
    if len(recent_hours) >= 3:
        spread = statistics.pstdev(recent_hours)
        if spread <= 0.5:
            return "Your sleep length is very consistent night to night."
        if spread <= 1.0:
            return "Your sleep length is fairly consistent."
        return "Your sleep length swings a lot night to night; a steadier routine tends to help."
    return ""


def _quality_note(qualities: list) -> str:
    qs = [q for q in qualities if q]
    if not qs:
        return ""
    poor = sum(1 for q in qs if q == "poor")
    good = sum(1 for q in qs if q == "good")
    if poor >= 2 and poor >= good:
        return "You’ve flagged several restless nights lately."
    if good and good >= max(1, poor):
        return "You’ve mostly rated these nights as good."
    return ""


def _detect_quality(lower: str) -> str | None:
    if any(w in lower for w in _POOR):
        return "poor"
    if any(w in lower for w in _GOOD):
        return "good"
    if any(w in lower for w in _OKAY):
        return "okay"
    return None


def _parse_clock(raw: str) -> int | None:
    s = raw.strip().lower().replace(" ", "")
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?(am|pm)?$", s)
    if not m:
        return None
    hh = int(m.group(1))
    mm = int(m.group(2) or 0)
    ap = m.group(3)
    if hh > 23 or mm > 59:
        return None
    if ap == "am" and hh == 12:
        hh = 0
    elif ap == "pm" and hh != 12:
        hh += 12
    return hh * 60 + mm


def _fmt_clock(minutes: int) -> str:
    minutes %= 24 * 60
    hh, mm = divmod(minutes, 60)
    ap = "am" if hh < 12 else "pm"
    h12 = hh % 12 or 12
    return f"{h12}:{mm:02d}{ap}" if mm else f"{h12}{ap}"


def _fmt_hours(h: float) -> str:
    n = int(round(h))
    if abs(h - n) < 0.05:
        return f"{n} hour" if n == 1 else f"{n} hours"
    return f"{h:.1f} hours"
