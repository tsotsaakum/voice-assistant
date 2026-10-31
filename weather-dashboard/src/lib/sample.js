import { describeCode } from "./weather";

function partsIn(timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag = {};
  for (const part of fmt.formatToParts(new Date())) bag[part.type] = part.value;
  return bag;
}

function iso(year, month, day, hour, minute = 0) {
  return `${year}-${month}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addDays(year, month, day, offset) {
  const dt = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + offset, 12));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return { year: String(y), month: m, day: d, date: `${y}-${m}-${d}` };
}

/** Realistic Shanghai evening sample so the glass layout is full before the network returns. */
export function sampleReport() {
  const tz = "Asia/Shanghai";
  const now = partsIn(tz);
  const hour = Number(now.hour);
  const curve = [18, 17, 17, 16, 16, 15, 15, 15, 16, 17, 18, 19, 20, 21, 21, 20, 19, 18, 18, 17, 17, 16, 16, 16];
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const h = (hour + i) % 24;
    const dayBump = h >= 24 ? 1 : h < hour ? 1 : 0;
    const date = addDays(now.year, now.month, now.day, dayBump > 0 && h < hour ? 1 : 0);
    const code = h >= 7 && h <= 16 ? 2 : 0;
    return {
      time: iso(date.year, date.month, date.day, h),
      temp: curve[h],
      apparent: curve[h] - 0.4,
      code,
      precip: h >= 20 ? 10 : 0,
      wind: 9 + (h % 4),
      visibility: 16000,
      uv: h >= 8 && h <= 16 ? Math.max(0, 5 - Math.abs(12 - h)) : 0,
    };
  });
  const sky = describeCode(0);
  const today = addDays(now.year, now.month, now.day, 0);
  const daily = [0, 2, 3, 1, 0, 2, 61].map((code, i) => {
    const date = addDays(now.year, now.month, now.day, i);
    const high = 22 - (i % 3);
    const low = 15 - (i % 2);
    return {
      date: date.date,
      high,
      low,
      code,
      precip: code >= 61 ? 60 : 10,
      uv: 4,
      sunrise: iso(date.year, date.month, date.day, 6, 12),
      sunset: iso(date.year, date.month, date.day, 17, 6),
      wind: 14,
    };
  });

  return {
    place: {
      id: 1796236,
      name: "Shanghai",
      admin1: "Shanghai Municipality",
      country: "China",
      latitude: 31.22222,
      longitude: 121.45806,
      timezone: tz,
    },
    fetchedAt: Date.now(),
    source: "sample",
    current: {
      temp: 18,
      apparent: 17.6,
      humidity: 76,
      wind: 9,
      code: 0,
      condition: sky.key,
      label: sky.label,
      isDay: hour >= 6 && hour < 18,
      cloud: 8,
      precipMm: 0,
      uv: hourly[0].uv,
      visibilityKm: 16,
      aqi: 42,
      pm: 12,
      high: daily[0].high,
      low: daily[0].low,
      sunrise: iso(today.year, today.month, today.day, 6, 12),
      sunset: iso(today.year, today.month, today.day, 17, 6),
    },
    hourly,
    daily,
  };
}
