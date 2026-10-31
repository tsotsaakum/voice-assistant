import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Heart, Search } from "lucide-react";
import Background from "./components/Background";
import Sidebar from "./components/Sidebar";
import SearchBar from "./components/SearchBar";
import CaptureSheet from "./components/CaptureSheet";
import { CityCards, DailyForecast, HourlyForecast, WeatherHero } from "./components/WeatherPanels";
import {
  ActionDock,
  CaloriesCard,
  FeaturedCard,
  LearningCard,
  NotesCard,
  PodcastCard,
  QuoteCard,
  SpendingCard,
} from "./components/Bento";
import { useUnits, useWeather } from "./context";
import { greetingFor, longDate } from "./lib/format";
import { buildAlerts, placeLine } from "./lib/weather";

function Tools() {
  const { report } = useWeather();
  const { units, setUnits } = useUnits();
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const alerts = buildAlerts(report);

  useEffect(() => {
    const close = () => {
      setBell(false);
      setMenu(false);
    };
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        aria-label="Focus city search"
        onClick={() => document.getElementById("city-search")?.focus()}
      >
        <Search className="h-4 w-4" />
      </button>
      <div className="relative">
        <button
          type="button"
          className="relative grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          aria-expanded={bell}
          aria-label="Weather alerts"
          onClick={() => {
            setBell((value) => !value);
            setMenu(false);
          }}
        >
          <Bell className="h-4 w-4" />
          {alerts.length > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#e8895a]" />
          )}
        </button>
        {bell && (
          <div className="glass absolute right-0 z-40 mt-2 w-72 p-3 text-left">
            <p className="px-1 text-xs uppercase tracking-[0.14em] text-white/50">Alerts · {report.place.name}</p>
            {alerts.length === 0 ? (
              <p className="px-1 py-3 text-sm text-white/75">No weather alerts for {report.place.name}.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {alerts.map((alert) => (
                  <li key={alert.id} className="rounded-2xl bg-white/10 px-3 py-2">
                    <div className="text-sm font-medium">{alert.title}</div>
                    <p className="text-sm text-white/70">{alert.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-semibold text-[#2a2148]"
          aria-expanded={menu}
          aria-label="Units and profile"
          onClick={() => {
            setMenu((value) => !value);
            setBell(false);
          }}
        >
          M
        </button>
        {menu && (
          <div className="glass absolute right-0 z-40 mt-2 w-52 p-2 text-left">
            <p className="px-2 py-1 text-xs uppercase tracking-[0.14em] text-white/50">Units</p>
            {[
              ["c", "Metric · °C, km/h"],
              ["f", "Imperial · °F, mph"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`block w-full rounded-xl px-2 py-2 text-left text-sm ${units === id ? "bg-white/15" : "hover:bg-white/10"}`}
                onClick={() => {
                  setUnits(id);
                  setMenu(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { report, status, error, retry, pendingName } = useWeather();
  const timezone = report.place.timezone;
  const greeting = greetingFor(timezone);
  const when = report.current.isDay ? "today" : "tonight";

  return (
    <div className="relative min-h-dvh">
      <Background condition={report.current.condition} isDay={report.current.isDay} />
      <div className="mx-auto flex w-full max-w-[1180px] gap-4 px-3 py-4 sm:px-5 md:py-5">
        <Sidebar />
        <main className="min-w-0 flex-1 space-y-4 pb-28 md:pb-10">
          <header id="top" className="scroll-mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-white/75">{longDate(timezone)}</p>
            <Tools />
          </header>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="pt-2 lg:pt-8">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={greeting}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  className="display font-serif text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
                >
                  {greeting}
                </motion.h1>
              </AnimatePresence>
              <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
                {report.current.label} {when} in {report.place.name}
                {placeLine(report.place) ? ` · ${placeLine(report.place)}` : ""}. Take a moment for yourself.{" "}
                <Heart className="inline h-4 w-4 fill-[#e8895a] text-[#e8895a]" aria-hidden="true" />
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/50">
                {status === "loading" && `Loading ${pendingName || report.place.name}…`}
                {status === "refreshing" && "Updating live weather…"}
                {status === "ready" && report.source === "live" && "Live · Open-Meteo"}
                {status === "ready" && report.source !== "live" && "Sample preview"}
                {status === "error" && "Weather update failed"}
              </p>
            </div>
            <WeatherHero />
          </div>

          {error && (
            <div className="glass flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm" role="alert">
              <span>{error}</span>
              <button type="button" className="rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          <SearchBar />
          <CityCards />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <QuoteCard />
            <SpendingCard />
            <CaloriesCard />
            <LearningCard />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <FeaturedCard />
            <PodcastCard />
            <NotesCard />
          </div>

          <HourlyForecast />
          <DailyForecast />
          <ActionDock />

          <footer className="pb-2 text-center text-xs text-white/45">
            Weather and air quality by{" "}
            <a className="underline decoration-white/30 underline-offset-2" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
          </footer>
        </main>
      </div>
      <CaptureSheet />
    </div>
  );
}
