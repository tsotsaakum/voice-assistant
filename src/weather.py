"""Live weather via Open-Meteo (free, no API key). Defaults to SA towns."""

from __future__ import annotations

import re

import httpx

DEFAULT_PLACE = "Johannesburg"

# Nicknames people actually say in SA
ALIASES = {
    "joburg": "Johannesburg",
    "jozi": "Johannesburg",
    "jhb": "Johannesburg",
    "egoli": "Johannesburg",
    "tshwane": "Pretoria",
    "pta": "Pretoria",
    "kaapstad": "Cape Town",
    "kaap": "Cape Town",
    "ekapa": "Cape Town",
    "ethekwini": "Durban",
    "dbn": "Durban",
    "mangaung": "Bloemfontein",
    "bloem": "Bloemfontein",
    "gqeberha": "Gqeberha",
    "port elizabeth": "Gqeberha",
    "pe": "Gqeberha",
    "pietersburg": "Polokwane",
    "nelspruit": "Mbombela",
    "mbombela": "Mbombela",
    "mafikeng": "Mahikeng",
}

WMO = {
    0: "clear skies",
    1: "mainly clear skies",
    2: "partly cloudy skies",
    3: "overcast skies",
    45: "fog",
    48: "freezing fog",
    51: "light drizzle",
    53: "drizzle",
    55: "heavy drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    66: "freezing rain",
    67: "heavy freezing rain",
    71: "light snow",
    73: "snow",
    75: "heavy snow",
    80: "light rain showers",
    81: "rain showers",
    82: "heavy rain showers",
    95: "thunderstorms",
    96: "thunderstorms with hail",
    99: "severe thunderstorms with hail",
}


def forecast(user_text: str = "") -> str:
    place = _place_from(user_text)
    try:
        geo = _geocode(place)
        if not geo:
            return f"I couldn't find {place}. Try a town name, like Cape Town or Polokwane."
        name, lat, lon, country = geo
        current = _current(lat, lon)
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return "Weather is down right now. Try again in a minute."

    temp = current.get("temperature_2m")
    humidity = current.get("relative_humidity_2m")
    wind = current.get("wind_speed_10m")
    if temp is None:
        return f"I found {place}, but the weather feed had no temperature."
    sky = WMO.get(int(current.get("weather_code") or 0), "mixed conditions")
    humidity = 0 if humidity is None else humidity
    wind = 0 if wind is None else wind
    where = name if country == "South Africa" else f"{name}, {country}"
    return (
        f"In {where} it's {temp:.0f}°C with {sky}. "
        f"Humidity {humidity:.0f}%, wind {wind:.0f} km/h."
    )


def _place_from(user_text: str) -> str:
    text = (user_text or "").strip().lower()
    for nick, official in sorted(ALIASES.items(), key=lambda item: -len(item[0])):
        if re.search(rf"\b{re.escape(nick)}\b", text):
            return official

    match = re.search(
        r"\b(?:in|for|at|near)\s+([a-z][a-z\s'-]{1,40})\b",
        text,
    )
    if match:
        raw = match.group(1).strip(" ?.,!")
        raw = re.sub(
            r"\b(please|today|now|weather|forecast|temperature)\b",
            "",
            raw,
        ).strip()
        if raw:
            return raw.title()

    return DEFAULT_PLACE


def _geocode(place: str) -> tuple[str, float, float, str] | None:
    params = {"name": place, "count": 5, "language": "en"}
    with httpx.Client(timeout=15.0) as client:
        data = client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params=params,
        ).json()
    results = data.get("results") or []
    if not results:
        return None
    za = [r for r in results if r.get("country_code") == "ZA"]
    pick = za[0] if za else results[0]
    return (
        pick.get("name") or place,
        float(pick["latitude"]),
        float(pick["longitude"]),
        pick.get("country") or "",
    )


def _current(lat: float, lon: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        "wind_speed_unit": "kmh",
        "timezone": "Africa/Johannesburg",
    }
    with httpx.Client(timeout=15.0) as client:
        data = client.get("https://api.open-meteo.com/v1/forecast", params=params).json()
    return data.get("current") or {}
