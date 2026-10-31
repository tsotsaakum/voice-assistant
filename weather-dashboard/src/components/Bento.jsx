import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Pause, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCapture, useUnits, useWeather } from "../context";
import { formatTemp, formatWind, money, sameLocalDay } from "../lib/format";
import { themeFor } from "../lib/themes";
import { useStored } from "../lib/storage";

const QUOTES = [
  {
    text: "Life isn’t about waiting for the storm to pass. It’s about learning to dance in the rain.",
    by: "Vivian Greene",
  },
  {
    text: "Clouds come floating into my life, no longer to carry rain or usher storm, but to add color to my sunset sky.",
    by: "Rabindranath Tagore",
  },
  {
    text: "The sky changes its mind all day. A good forecast is just listening.",
    by: "Field notes",
  },
  {
    text: "Sunshine is delicious, rain is refreshing, wind braces us up, snow is exhilarating.",
    by: "John Ruskin",
  },
];

const DEFAULT_NOTES = [
  { id: "flights", text: "Book flights", done: false },
  { id: "hotel", text: "Confirm the hotel", done: false },
  { id: "route", text: "Plan the route", done: false },
  { id: "pack", text: "Pack for the weather", done: false },
];

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function MiniSky({ condition, isDay }) {
  const theme = themeFor(condition, isDay);
  return (
    <div className="relative h-28 overflow-hidden rounded-[22px] sm:h-full sm:min-h-[132px]" style={{ background: theme.background }} aria-hidden="true">
      <motion.div
        className="absolute right-5 top-4 h-11 w-11 rounded-full"
        style={{ background: theme.orb, boxShadow: `0 0 28px ${theme.orb}` }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute bottom-5 left-2 h-7 w-[4.5rem] rounded-full bg-white/80" />
      <div className="absolute bottom-8 left-7 h-8 w-16 rounded-full bg-white/70" />
      <div className="absolute bottom-4 right-2 h-6 w-14 rounded-full bg-white/55" />
    </div>
  );
}

export function QuoteCard() {
  const [index, setIndex] = useState(0);
  const quote = QUOTES[index % QUOTES.length];
  return (
    <section id="quote" className="scroll-mt-6 glass lift flex min-h-[230px] flex-col p-5">
      <div className="font-serif text-4xl leading-none text-white/80">“</div>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed">{quote.text}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-white/65">
        <span>— {quote.by}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20"
          onClick={() => setIndex((value) => value + 1)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Another line
        </button>
      </div>
    </section>
  );
}

export function SpendingCard() {
  const { open } = useCapture();
  const [entries] = useStored("expenses", []);
  const list = Array.isArray(entries) ? entries : [];
  const today = list.filter((item) => sameLocalDay(item.at));
  const month = list.filter((item) => new Date(item.at).getMonth() === new Date().getMonth());
  const todayTotal = today.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthTotal = month.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toDateString();
    const total = list
      .filter((item) => new Date(item.at).toDateString() === key)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return total;
  });
  const max = Math.max(...days, 1);
  const width = 280;
  const height = 72;
  const path = days
    .map((value, index) => {
      const x = (index / 6) * width;
      const y = height - (value / max) * (height - 10) - 4;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <section className="glass lift flex min-h-[230px] flex-col p-5">
      <div className="flex items-start justify-between">
        <h2 className="text-sm text-white/70">Spent today</h2>
        <button type="button" className="rounded-full bg-white/10 p-1.5 hover:bg-white/20" aria-label="Record an expense" onClick={() => open("expense")}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 font-serif text-4xl tracking-tight tabular-nums">{money(todayTotal)}</p>
      <p className="text-sm text-white/55">This month {money(monthTotal)}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-auto h-16 w-full" aria-hidden="true">
        <motion.path
          d={path}
          fill="none"
          stroke="#e8895a"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
        />
      </svg>
    </section>
  );
}

export function CaloriesCard() {
  const { open } = useCapture();
  const [entries, setEntries] = useStored("calories", []);
  const list = (Array.isArray(entries) ? entries : []).filter((item) => sameLocalDay(item.at));
  const kcal = list.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
  const protein = list.reduce((sum, item) => sum + Number(item.protein || 0), 0);
  const fat = list.reduce((sum, item) => sum + Number(item.fat || 0), 0);
  const water = list.reduce((sum, item) => sum + Number(item.water || 0), 0);
  const goal = 1800;
  const pct = Math.max(0, Math.min(1, kcal / goal));
  const radius = 28;
  const circ = 2 * Math.PI * radius;

  function addWater() {
    setEntries((items) => [
      { id: crypto.randomUUID(), label: "Water", kcal: 0, protein: 0, fat: 0, water: 250, at: new Date().toISOString() },
      ...(Array.isArray(items) ? items : []),
    ]);
  }

  return (
    <section className="glass lift flex min-h-[230px] flex-col p-5">
      <div className="flex items-start justify-between">
        <h2 className="text-sm text-white/70">Today’s energy</h2>
        <button type="button" className="rounded-full bg-white/10 p-1.5 hover:bg-white/20" aria-label="Log food" onClick={() => open("calories")}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="0 0 72 72" className="h-16 w-16 shrink-0" aria-hidden="true">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="#e8895a"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            transform="rotate(-90 36 36)"
          />
          <text x="36" y="40" textAnchor="middle" fontSize="11" fill="white">
            {Math.round(kcal)}
          </text>
        </svg>
        <div className="text-sm text-white/75">
          <div>{Math.round(kcal)} / {goal} kcal</div>
          <button type="button" className="mt-1 text-white underline-offset-2 hover:underline" onClick={addWater}>
            Water {water} ml
          </button>
        </div>
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2 pt-3 text-xs text-white/65">
        <div>
          <dt>Protein</dt>
          <dd className="text-sm text-white">{Math.round(protein)} g</dd>
        </div>
        <div>
          <dt>Fat</dt>
          <dd className="text-sm text-white">{Math.round(fat)} g</dd>
        </div>
        <div>
          <dt>Left</dt>
          <dd className="text-sm text-white">{Math.max(0, goal - Math.round(kcal))} kcal</dd>
        </div>
      </dl>
    </section>
  );
}

export function LearningCard() {
  const [log, setLog] = useStored("learning", { date: todayKey(), seconds: 0 });
  const [running, setRunning] = useState(false);
  const goal = 20 * 60;
  const stored = log?.date === todayKey() ? log : { date: todayKey(), seconds: 0 };
  const seconds = stored.seconds || 0;
  const pct = Math.max(0, Math.min(1, seconds / goal));
  const radius = 26;
  const circ = 2 * Math.PI * radius;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setLog((current) => {
        const base = current?.date === todayKey() ? current : { date: todayKey(), seconds: 0 };
        return { date: todayKey(), seconds: (base.seconds || 0) + 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, setLog]);

  const minutes = Math.floor(seconds / 60);

  return (
    <section id="learn" className="scroll-mt-6 glass lift flex min-h-[230px] flex-col p-5">
      <h2 className="text-sm text-white/70">Today’s study</h2>
      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="0 0 68 68" className="h-16 w-16" aria-hidden="true">
          <circle cx="34" cy="34" r={radius} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="6" />
          <circle
            cx="34"
            cy="34"
            r={radius}
            fill="none"
            stroke="#e8895a"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            transform="rotate(-90 34 34)"
          />
        </svg>
        <div>
          <div className="font-serif text-3xl tabular-nums">{minutes}</div>
          <div className="text-sm text-white/60">/ 20 min</div>
        </div>
      </div>
      <p className="mt-2 text-sm text-white/60">{running ? "Session running" : "Nothing logged yet today"}</p>
      <button type="button" className="coral mt-auto w-fit rounded-full px-4 py-2 text-sm font-medium" onClick={() => setRunning((value) => !value)}>
        {running ? "Pause" : "Start learning"}
      </button>
    </section>
  );
}

export function FeaturedCard() {
  const { report } = useWeather();
  const { units } = useUnits();
  const current = report.current;
  const age = Math.max(0, Math.round((Date.now() - report.fetchedAt) / 60000));
  const updated = age < 1 ? "Updated just now" : `Updated ${age} min ago`;
  const body = current.isDay
    ? `Daylight in ${report.place.name}. Feels like ${formatTemp(current.apparent, units)}, wind ${formatWind(current.wind, units)}.`
    : `Night over ${report.place.name}. Feels like ${formatTemp(current.apparent, units)}, wind ${formatWind(current.wind, units)}.`;

  return (
    <section id="news" className="scroll-mt-6 glass lift grid gap-4 p-5 sm:grid-cols-[1fr_150px]">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/50">From the sky</p>
        <h2 className="mt-2 font-serif text-[1.65rem] leading-tight">
          {current.label} over {report.place.name}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75">{body}</p>
        <p className="mt-4 text-xs text-white/50">{updated}</p>
      </div>
      <MiniSky condition={current.condition} isDay={current.isDay} />
    </section>
  );
}

export function PodcastCard() {
  const { report } = useWeather();
  const { units } = useUnits();
  const duration = 56 * 60 + 10;
  const [seconds, setSeconds] = useState(12 * 60 + 30);
  const [playing, setPlaying] = useState(false);
  const current = report.current;

  const script = useMemo(() => {
    return `Weather briefing for ${report.place.name}. ${current.label}. ${formatTemp(current.temp, units).replace("°", " degrees")}. Feels like ${formatTemp(current.apparent, units).replace("°", " degrees")}. Humidity ${Math.round(current.humidity || 0)} percent. Wind ${formatWind(current.wind, units)}.`;
  }, [report, units, current]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setSeconds((value) => (value >= duration ? duration : value + 1));
    }, 1000);
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.rate = 1;
      utterance.onend = () => setPlaying(false);
      synth.speak(utterance);
    }
    return () => {
      clearInterval(timer);
      window.speechSynthesis?.cancel();
    };
  }, [playing, script, duration]);

  function toggle() {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    setPlaying(true);
  }

  const stamp = (value) => {
    const m = Math.floor(value / 60);
    const s = value % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <section id="listen" className="scroll-mt-6 glass lift flex min-h-[220px] flex-col p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-white/50">Listen</p>
      <h2 className="mt-2 font-serif text-3xl leading-none">Design Better</h2>
      <p className="mt-2 text-sm text-white/70">EP 97 · Live briefing for {report.place.name}</p>
      <div className="mt-auto pt-4">
        <div className="mb-2 flex items-center justify-between text-xs tabular-nums text-white/60">
          <span>{stamp(seconds)}</span>
          <span>{stamp(duration)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#e8895a]" style={{ width: `${(seconds / duration) * 100}%` }} />
        </div>
        <button
          type="button"
          className="coral mt-4 grid h-11 w-11 place-items-center rounded-full"
          aria-label={playing ? "Pause briefing" : "Play weather briefing"}
          onClick={toggle}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
      </div>
    </section>
  );
}

export function NotesCard() {
  const { open } = useCapture();
  const [notes, setNotes] = useStored("notes", DEFAULT_NOTES);
  const [ideas] = useStored("journal", []);
  const [showDone, setShowDone] = useState(true);
  const [draft, setDraft] = useState("");
  const list = (Array.isArray(notes) && notes.length ? notes : DEFAULT_NOTES).filter((item) => showDone || !item.done);

  function toggle(id) {
    setNotes((items) => (Array.isArray(items) ? items : DEFAULT_NOTES).map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  }

  function remove(id) {
    setNotes((items) => (Array.isArray(items) ? items : DEFAULT_NOTES).filter((item) => item.id !== id));
  }

  function add(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setNotes((items) => [{ id: crypto.randomUUID(), text, done: false }, ...(Array.isArray(items) ? items : DEFAULT_NOTES)]);
    setDraft("");
  }

  return (
    <section id="notes" className="scroll-mt-6 glass lift flex min-h-[220px] flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Trip checklist</h2>
          <p id="journal" className="scroll-mt-6 text-sm text-white/55">
            Notes and ideas
          </p>
        </div>
        <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20" onClick={() => setShowDone((value) => !value)} aria-pressed={showDone}>
          {showDone ? "Hide done" : "Show done"}
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {list.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className={`grid h-5 w-5 place-items-center rounded-full border ${item.done ? "border-[#e8895a] bg-[#e8895a]" : "border-white/40"}`}
              aria-label={item.done ? `Mark ${item.text} not done` : `Mark ${item.text} done`}
            >
              {item.done && <Check className="h-3 w-3 text-white" />}
            </button>
            <span className={`flex-1 text-sm ${item.done ? "text-white/45 line-through" : ""}`}>{item.text}</span>
            <button type="button" className="text-white/45 hover:text-white" aria-label={`Remove ${item.text}`} onClick={() => remove(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-white/55">Nothing to show.</li>}
      </ul>
      {(ideas || []).slice(0, 3).map((idea) => (
        <p key={idea.id} className="mt-2 text-sm text-white/70">
          Idea · {idea.text}
        </p>
      ))}
      <form onSubmit={add} className="mt-auto flex gap-2 pt-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a checklist item"
          className="min-w-0 flex-1 rounded-full bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40"
        />
        <button type="button" className="rounded-full bg-white/10 px-3 text-xs hover:bg-white/20" onClick={() => open("idea")}>
          Idea
        </button>
      </form>
    </section>
  );
}

export function ActionDock() {
  const { open } = useCapture();
  const pills = [
    { id: "expense", label: "Record expense", hint: "Spending" },
    { id: "calories", label: "Log energy", hint: "Calories" },
    { id: "idea", label: "Save an idea", hint: "Journal" },
  ];
  return (
    <div className="flex justify-center">
      <div className="glass flex flex-wrap justify-center gap-2 rounded-full px-3 py-2">
        {pills.map((pill) => (
          <button key={pill.id} type="button" onClick={() => open(pill.id)} className="rounded-full px-4 py-2 text-sm hover:bg-white/15">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-white/45">{pill.hint}</span>
            {pill.label}
          </button>
        ))}
      </div>
    </div>
  );
}
