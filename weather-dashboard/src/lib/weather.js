export function describeCode(code) {
  const c = Number(code);
  if (c === 0) return { key: "clear", label: "Clear" };
  if (c === 1) return { key: "partly", label: "Mainly clear" };
  if (c === 2) return { key: "partly", label: "Partly cloudy" };
  if (c === 3) return { key: "cloudy", label: "Overcast" };
  if (c === 45) return { key: "fog", label: "Fog" };
  if (c === 48) return { key: "fog", label: "Freezing fog" };
  if (c === 51 || c === 56) return { key: "drizzle", label: "Light drizzle" };
  if (c === 53) return { key: "drizzle", label: "Drizzle" };
  if (c === 55 || c === 57) return { key: "drizzle", label: "Heavy drizzle" };
  if (c === 61 || c === 66) return { key: "rain", label: "Light rain" };
  if (c === 63) return { key: "rain", label: "Rain" };
  if (c === 65 || c === 67) return { key: "rain", label: "Heavy rain" };
  if (c === 71) return { key: "snow", label: "Light snow" };
  if (c === 73 || c === 77) return { key: "snow", label: "Snow" };
  if (c === 75) return { key: "snow", label: "Heavy snow" };
  if (c === 80) return { key: "rain", label: "Light showers" };
  if (c === 81) return { key: "rain", label: "Rain showers" };
  if (c === 82) return { key: "rain", label: "Heavy showers" };
  if (c === 85) return { key: "snow", label: "Snow showers" };
  if (c === 86) return { key: "snow", label: "Heavy snow showers" };
  if (c === 95) return { key: "thunder", label: "Thunderstorm" };
  if (c === 96 || c === 99) return { key: "thunder", label: "Thunderstorm with hail" };
  return { key: "cloudy", label: "Cloudy" };
}

export function aqiMeta(aqi) {
  if (aqi == null || Number.isNaN(Number(aqi))) return { label: "—", tone: "muted" };
  const n = Math.round(Number(aqi));
  if (n <= 50) return { label: "Good", tone: "good" };
  if (n <= 100) return { label: "Moderate", tone: "moderate" };
  if (n <= 150) return { label: "Sensitive", tone: "sensitive" };
  if (n <= 200) return { label: "Unhealthy", tone: "bad" };
  if (n <= 300) return { label: "Very unhealthy", tone: "bad" };
  return { label: "Hazardous", tone: "bad" };
}

export function normalizePlace(raw) {
  return {
    id: raw.id,
    name: raw.name,
    admin1: raw.admin1 || "",
    country: raw.country || "",
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone || "auto",
  };
}

export function placeLine(place) {
  if (!place) return "";
  const similar = (a, b) =>
    a && b && (a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase()));
  const parts = [];
  if (place.admin1 && !similar(place.admin1, place.name)) parts.push(place.admin1);
  if (place.country) parts.push(place.country);
  return parts.join(" · ");
}

export async function searchPlaces(name, signal) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("geocode");
  const data = await res.json();
  return (data.results || []).map(normalizePlace);
}

function hourIndex(times, currentTime) {
  const key = currentTime.slice(0, 13);
  const idx = times.findIndex((t) => t.slice(0, 13) === key);
  return idx >= 0 ? idx : 0;
}

export async function fetchReport(place) {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(place.latitude));
  forecastUrl.searchParams.set("longitude", String(place.longitude));
  forecastUrl.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "is_day",
      "cloud_cover",
      "precipitation",
    ].join(","),
  );
  forecastUrl.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "weather_code",
      "visibility",
      "uv_index",
      "precipitation_probability",
      "wind_speed_10m",
      "apparent_temperature",
    ].join(","),
  );
  forecastUrl.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "uv_index_max",
      "precipitation_probability_max",
      "sunrise",
      "sunset",
      "wind_speed_10m_max",
    ].join(","),
  );
  forecastUrl.searchParams.set("timezone", place.timezone || "auto");
  forecastUrl.searchParams.set("forecast_days", "7");
  forecastUrl.searchParams.set("wind_speed_unit", "kmh");

  const aqUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  aqUrl.searchParams.set("latitude", String(place.latitude));
  aqUrl.searchParams.set("longitude", String(place.longitude));
  aqUrl.searchParams.set("current", "us_aqi,pm2_5");
  aqUrl.searchParams.set("timezone", place.timezone || "auto");

  const [forecastRes, aqRes] = await Promise.all([
    fetch(forecastUrl),
    fetch(aqUrl).catch(() => null),
  ]);
  if (!forecastRes.ok) throw new Error("forecast");
  const forecast = await forecastRes.json();
  if (forecast.current?.temperature_2m == null) throw new Error("empty");

  let aqi = null;
  let pm = null;
  if (aqRes && aqRes.ok) {
    const aq = await aqRes.json();
    aqi = aq.current?.us_aqi ?? null;
    pm = aq.current?.pm2_5 ?? null;
  }

  const hourly = forecast.hourly;
  const idx = hourIndex(hourly.time, forecast.current.time);
  const hours = hourly.time.slice(idx, idx + 24).map((time, offset) => {
    const j = idx + offset;
    return {
      time,
      temp: hourly.temperature_2m[j],
      apparent: hourly.apparent_temperature[j],
      code: hourly.weather_code[j],
      precip: hourly.precipitation_probability[j] ?? 0,
      wind: hourly.wind_speed_10m[j],
      visibility: hourly.visibility[j],
      uv: hourly.uv_index[j],
    };
  });

  const dailyRaw = forecast.daily;
  const days = dailyRaw.time.slice(0, 7).map((date, i) => ({
    date,
    high: dailyRaw.temperature_2m_max[i],
    low: dailyRaw.temperature_2m_min[i],
    code: dailyRaw.weather_code[i],
    precip: dailyRaw.precipitation_probability_max[i] ?? 0,
    uv: dailyRaw.uv_index_max[i],
    sunrise: dailyRaw.sunrise?.[i] ?? null,
    sunset: dailyRaw.sunset?.[i] ?? null,
    wind: dailyRaw.wind_speed_10m_max?.[i] ?? null,
  }));

  const sky = describeCode(forecast.current.weather_code);
  const here = hours[0] || {};
  const visibility = here.visibility;

  return {
    place: {
      ...place,
      timezone: forecast.timezone || place.timezone || "UTC",
    },
    fetchedAt: Date.now(),
    source: "live",
    current: {
      temp: forecast.current.temperature_2m,
      apparent: forecast.current.apparent_temperature,
      humidity: forecast.current.relative_humidity_2m,
      wind: forecast.current.wind_speed_10m,
      code: forecast.current.weather_code,
      condition: sky.key,
      label: sky.label,
      isDay: Boolean(forecast.current.is_day),
      cloud: forecast.current.cloud_cover,
      precipMm: forecast.current.precipitation,
      uv: here.uv ?? days[0]?.uv ?? null,
      visibilityKm: visibility == null ? null : visibility / 1000,
      aqi,
      pm,
      high: days[0]?.high ?? null,
      low: days[0]?.low ?? null,
      sunrise: days[0]?.sunrise ?? null,
      sunset: days[0]?.sunset ?? null,
    },
    hourly: hours,
    daily: days,
  };
}

export function buildAlerts(report) {
  if (!report) return [];
  const c = report.current;
  const alerts = [];
  const air = aqiMeta(c.aqi);
  if (c.aqi != null && c.aqi > 100) {
    alerts.push({
      id: "aqi",
      title: `Air quality · ${air.label}`,
      body: `US AQI ${Math.round(c.aqi)} in ${report.place.name}.`,
    });
  }
  if (c.uv != null && c.uv >= 6) {
    alerts.push({
      id: "uv",
      title: "High UV",
      body: `UV index ${c.uv} — cover up if you are outside.`,
    });
  }
  if (c.wind != null && c.wind >= 40) {
    alerts.push({
      id: "wind",
      title: "Strong wind",
      body: `Wind is ${Math.round(c.wind)} km/h.`,
    });
  }
  if (c.condition === "thunder") {
    alerts.push({
      id: "storm",
      title: "Thunderstorm",
      body: `${c.label} around ${report.place.name}.`,
    });
  } else if (c.condition === "rain" || c.condition === "snow") {
    alerts.push({
      id: "sky",
      title: c.label,
      body: `${c.label} in ${report.place.name} right now.`,
    });
  }
  const soon = (report.hourly || []).slice(0, 6).some((h) => (h.precip || 0) >= 50);
  if (soon && c.condition !== "rain" && c.condition !== "thunder" && c.condition !== "snow") {
    alerts.push({
      id: "soon",
      title: "Rain likely soon",
      body: "The next few hours include a high chance of precipitation.",
    });
  }
  return alerts;
}
