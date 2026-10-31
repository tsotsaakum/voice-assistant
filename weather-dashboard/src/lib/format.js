export function formatNumber(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

export function toDisplayTemp(celsius, units) {
  if (celsius == null || Number.isNaN(Number(celsius))) return null;
  const c = Number(celsius);
  return units === "f" ? (c * 9) / 5 + 32 : c;
}

export function formatTemp(celsius, units) {
  const n = toDisplayTemp(celsius, units);
  if (n == null) return "—";
  return `${Math.round(n)}°`;
}

export function tempParts(celsius, units) {
  const n = toDisplayTemp(celsius, units);
  if (n == null) return { value: "—", unit: units === "f" ? "F" : "C" };
  return { value: String(Math.round(n)), unit: units === "f" ? "F" : "C" };
}

export function formatHumidity(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value))}%`;
}

export function formatWind(kmh, units) {
  if (kmh == null || Number.isNaN(Number(kmh))) return "—";
  if (units === "f") return `${Math.round(Number(kmh) * 0.621371)} mph`;
  return `${Math.round(Number(kmh))} km/h`;
}

export function formatVisibility(km, units) {
  if (km == null || Number.isNaN(Number(km))) return "—";
  const miles = Number(km) * 0.621371;
  if (units === "f") {
    return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
  }
  const n = Number(km);
  return n < 10 ? `${n.toFixed(1)} km` : `${Math.round(n)} km`;
}

export function formatUv(uv) {
  if (uv == null || Number.isNaN(Number(uv))) return "—";
  const rounded = Math.round(Number(uv) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function hourLabel(iso) {
  if (!iso || iso.length < 13) return "—";
  const h = Number(iso.slice(11, 13));
  if (Number.isNaN(h)) return "—";
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr} ${suffix}`;
}

export function clockLabel(iso) {
  if (!iso || iso.length < 16) return "—";
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m} ${suffix}`;
}

export function weekdayLabel(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(dt);
}

export function longDate(timezone) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: timezone || "UTC",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
  }
}

export function greetingFor(timezone) {
  let hour = new Date().getHours();
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone: timezone || "UTC",
      }).format(new Date()),
    );
  } catch {
    hour = new Date().getHours();
  }
  if (hour < 5 || hour >= 21) return "Good night.";
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

export function daylightLabel(sunrise, sunset) {
  if (!sunrise || !sunset || sunrise.length < 16 || sunset.length < 16) return "—";
  const mins = (iso) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  let delta = mins(sunset) - mins(sunrise);
  if (delta < 0) delta += 24 * 60;
  const h = Math.floor(delta / 60);
  const m = delta % 60;
  return `${h}h ${m}m`;
}

export function money(amount) {
  const n = Number(amount) || 0;
  return `¥ ${n.toFixed(2)}`;
}

export function sameLocalDay(iso, timezone) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(new Date(iso)) === fmt.format(new Date());
  } catch {
    return new Date(iso).toDateString() === new Date().toDateString();
  }
}
