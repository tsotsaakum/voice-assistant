import { useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Eye,
  Star,
  SunMedium,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from "lucide-react";
import WeatherIcon from "./WeatherIcon";
import { useUnits, useWeather } from "../context";
import { aqiMeta, describeCode, placeLine } from "../lib/weather";
import {
  clockLabel,
  daylightLabel,
  formatHumidity,
  formatTemp,
  formatUv,
  formatVisibility,
  formatWind,
  hourLabel,
  tempParts,
  weekdayLabel,
} from "../lib/format";
import { useStored } from "../lib/storage";

function Chip({ icon: Icon, label, value, testId }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2.5" data-testid={testId}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/55">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function WeatherHero() {
  const { report, status } = useWeather();
  const { units } = useUnits();
  const [saved, setSaved] = useStored("saved", []);
  const current = report.current;
  const parts = tempParts(current.temp, units);
  const air = aqiMeta(current.aqi);
  const pinned = saved.some((place) => place.id === report.place.id);
  const loading = status === "loading";

  function toggleSave() {
    setSaved((list) => {
      const items = Array.isArray(list) ? list : [];
      if (items.some((place) => place.id === report.place.id)) {
        return items.filter((place) => place.id !== report.place.id);
      }
      return [report.place, ...items].slice(0, 8);
    });
  }

  return (
    <section id="weather" className="scroll-mt-6 glass lift p-5 sm:p-6" aria-busy={loading} data-testid="weather-hero">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <WeatherIcon code={current.code} isDay={current.isDay} size={58} />
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-white/55">{current.isDay ? "Daylight" : "Night"}</div>
            <div className="mt-1 text-sm text-white/80" data-testid="condition-label">
              {loading ? "Loading…" : current.label}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSave}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          aria-pressed={pinned}
          aria-label={pinned ? "Remove saved city" : "Save city"}
        >
          <Star className={`h-4 w-4 ${pinned ? "fill-[#e8895a] text-[#e8895a]" : ""}`} />
        </button>
      </div>

      <div className="mt-4 flex items-end gap-1" data-testid="temperature">
        {loading ? (
          <div className="h-[72px] w-36 animate-pulse rounded-2xl bg-white/15" />
        ) : (
          <motion.div
            key={`${report.place.id}-${parts.value}-${units}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-start"
          >
            <span className="font-serif text-[72px] leading-none tracking-[-0.05em]">{parts.value}</span>
            <span className="mt-2 text-2xl font-medium text-white/80">°{parts.unit}</span>
          </motion.div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2 text-lg font-semibold" data-testid="city-name">
          {report.place.name}
        </div>
        <p className="text-sm text-white/65">{placeLine(report.place)}</p>
      </div>

      <p className="mt-3 flex flex-wrap gap-x-2 text-sm text-white/80" data-testid="weather-meta">
        <span>
          AQI {current.aqi == null ? "—" : Math.round(current.aqi)}
          {air.label !== "—" ? ` · ${air.label}` : ""}
        </span>
        <span>Humidity {formatHumidity(current.humidity)}</span>
        <span className="whitespace-nowrap">
          {formatTemp(current.low, units)} – {formatTemp(current.high, units)}
        </span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        <Chip icon={Thermometer} label="Feels like" value={formatTemp(current.apparent, units)} testId="feels-like" />
        <Chip icon={Droplets} label="Humidity" value={formatHumidity(current.humidity)} testId="humidity" />
        <Chip icon={Wind} label="Wind" value={formatWind(current.wind, units)} testId="wind" />
        <Chip icon={SunMedium} label="UV index" value={formatUv(current.uv)} testId="uv" />
        <Chip icon={Eye} label="Visibility" value={formatVisibility(current.visibilityKm, units)} testId="visibility" />
        <Chip icon={Droplets} label="Air" value={current.aqi == null ? "—" : `${Math.round(current.aqi)} AQI`} testId="aqi" />
      </div>

      <div id="sky" className="scroll-mt-6 mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/15 pt-3 text-sm text-white/75">
        <span className="inline-flex items-center gap-1.5">
          <Sunrise className="h-4 w-4" /> {clockLabel(current.sunrise)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sunset className="h-4 w-4" /> {clockLabel(current.sunset)}
        </span>
        <span>Daylight {daylightLabel(current.sunrise, current.sunset)}</span>
      </div>
    </section>
  );
}

function curvePath(values, width, height) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * (height - 16) - 8;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function HourlyForecast() {
  const { report, status } = useWeather();
  const { units } = useUnits();
  const scroller = useRef(null);
  const temps = report.hourly.map((hour) => hour.temp);
  const line = curvePath(temps, 640, 88);

  function scrollBy(direction) {
    scroller.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  }

  return (
    <section className="glass p-4 sm:p-5" aria-busy={status === "loading"} data-testid="hourly">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Hourly</h2>
          <p className="text-sm text-white/60">Next 24 hours · {report.place.name}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Scroll hourly forecast earlier" onClick={() => scrollBy(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Scroll hourly forecast later" onClick={() => scrollBy(1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <svg viewBox="0 0 640 88" className="mb-3 h-20 w-full" aria-hidden="true">
        <motion.path
          key={report.place.id + line}
          d={line}
          fill="none"
          stroke="#e8895a"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div ref={scroller} className="scroll-x flex gap-3 pb-1" data-testid="hourly-scroll">
        {report.hourly.map((hour, index) => {
          const sky = describeCode(hour.code);
          return (
            <article key={hour.time} className="snap-card min-w-[92px] rounded-3xl bg-white/10 px-3 py-3 text-center">
              <div className="text-xs text-white/60">{index === 0 ? "Now" : hourLabel(hour.time)}</div>
              <div className="my-2 flex justify-center">
                <WeatherIcon code={hour.code} isDay={Number(hour.time.slice(11, 13)) >= 6 && Number(hour.time.slice(11, 13)) < 18} size={28} animate={false} />
              </div>
              <div className="text-lg font-semibold tabular-nums">{formatTemp(hour.temp, units)}</div>
              <div className="mt-1 text-[11px] text-white/55">{sky.label}</div>
              <div className="text-[11px] text-white/55">{Math.round(hour.precip || 0)}%</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function DailyForecast() {
  const { report, status } = useWeather();
  const { units } = useUnits();
  const scroller = useRef(null);

  return (
    <section className="glass p-4 sm:p-5" aria-busy={status === "loading"} data-testid="daily-forecast">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">7-day forecast</h2>
          <p className="text-sm text-white/60">{report.place.name}</p>
        </div>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Scroll daily forecast"
          onClick={() => scroller.current?.scrollBy({ left: 240, behavior: "smooth" })}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div ref={scroller} className="scroll-x flex gap-3">
        {report.daily.map((day, index) => {
          const sky = describeCode(day.code);
          return (
            <article
              key={day.date}
              className={`snap-card min-w-[132px] rounded-[24px] border px-3 py-4 ${
                index === 0 ? "border-[#e8895a]/70 bg-white/15" : "border-white/15 bg-white/10 hover:bg-white/15"
              }`}
            >
              <div className="text-sm font-medium">{index === 0 ? "Today" : weekdayLabel(day.date)}</div>
              <div className="my-3">
                <WeatherIcon code={day.code} isDay size={32} animate={false} />
              </div>
              <div className="text-sm text-white/70">{sky.label}</div>
              <div className="mt-2 text-lg font-semibold tabular-nums">
                {formatTemp(day.high, units)}
                <span className="ml-1 text-sm font-medium text-white/55">{formatTemp(day.low, units)}</span>
              </div>
              <div className="mt-1 text-xs text-white/55">{Math.round(day.precip || 0)}% rain</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CityCards() {
  const { report, loadPlace } = useWeather();
  const [saved] = useStored("saved", []);
  const [recent] = useStored("recent", []);
  const merged = [];
  for (const place of [...(saved || []), ...(recent || [])]) {
    if (!merged.some((item) => item.id === place.id)) merged.push(place);
  }

  return (
    <section id="cards" className="scroll-mt-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">City cards</h2>
        <p className="text-sm text-white/55">Pinned and recent places</p>
      </div>
      {merged.length === 0 ? (
        <div className="glass px-4 py-5 text-sm text-white/70">Search a city to pin it here.</div>
      ) : (
        <div className="scroll-x flex gap-3">
          {merged.map((place) => {
            const on = place.id === report.place.id;
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => loadPlace(place)}
                className={`snap-card glass min-w-[180px] px-4 py-3 text-left ${on ? "border-[#e8895a]/70" : "lift"}`}
              >
                <div className="text-sm text-white/55">{place.country}</div>
                <div className="mt-1 font-semibold">{place.name}</div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
