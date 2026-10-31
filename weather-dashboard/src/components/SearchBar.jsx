import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { searchPlaces, placeLine } from "../lib/weather";
import { useCapture, useWeather } from "../context";

export default function SearchBar() {
  const { loadPlace, status } = useWeather();
  const { open } = useCapture();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggest, setSuggest] = useState("idle");
  const [notice, setNotice] = useState("");
  const [openList, setOpenList] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const box = useRef(null);
  const listId = useId();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSuggest(q ? "short" : "idle");
      return undefined;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSuggest("loading");
      try {
        const places = await searchPlaces(q, ctrl.signal);
        setResults(places);
        setHighlight(0);
        setSuggest(places.length ? "results" : "none");
      } catch (error) {
        if (error.name === "AbortError") return;
        setResults([]);
        setSuggest("error");
      }
    }, 280);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const onPointer = (event) => {
      if (!box.current?.contains(event.target)) setOpenList(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  async function choose(place) {
    setQuery(place.name);
    setOpenList(false);
    setNotice("");
    await loadPlace(place);
  }

  async function submit(event) {
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      setNotice("Enter a city name.");
      setOpenList(true);
      setSuggest("empty");
      return;
    }
    if (q.length < 2) {
      setNotice("Type at least 2 letters.");
      setOpenList(true);
      return;
    }
    if (suggest === "results" && results[highlight]) {
      await choose(results[highlight]);
      return;
    }
    setSuggest("loading");
    setOpenList(true);
    try {
      const places = await searchPlaces(q);
      setResults(places);
      setHighlight(0);
      if (!places.length) {
        setSuggest("none");
        setNotice(`No places found for “${q}”.`);
        return;
      }
      setSuggest("results");
      setNotice("");
      await choose(places[0]);
    } catch {
      setSuggest("error");
      setNotice("Place search is unavailable. Try again in a moment.");
    }
  }

  function onKeyDown(event) {
    if (!openList && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpenList(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setOpenList(false);
    }
  }

  const message =
    notice ||
    (suggest === "none" && query.trim().length >= 2 ? `No places found for “${query.trim()}”.` : "") ||
    (suggest === "error" ? "Place search is unavailable. Try again in a moment." : "") ||
    (suggest === "empty" ? "Enter a city name." : "") ||
    (suggest === "short" && openList ? "Type at least 2 letters." : "");

  return (
    <div className="relative z-30" ref={box}>
      <form onSubmit={submit} className="glass glass-flat flex items-center gap-2 rounded-full p-1.5 pl-4" role="search">
        <Search className="h-5 w-5 shrink-0 text-white/70" aria-hidden="true" />
        <label className="sr-only" htmlFor="city-search">
          Search for a city
        </label>
        <input
          id="city-search"
          data-testid="city-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setNotice("");
            setOpenList(true);
          }}
          onFocus={() => setOpenList(true)}
          onKeyDown={onKeyDown}
          placeholder="Search a city — Cape Town, Tokyo, Mumbai…"
          autoComplete="off"
          role="combobox"
          aria-expanded={openList}
          aria-controls={listId}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-white/45"
        />
        {(suggest === "loading" || status === "loading") && (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white/70" aria-label="Loading" />
        )}
        <button
          type="button"
          className="coral grid h-11 w-11 shrink-0 place-items-center rounded-full"
          aria-label="Quick record"
          onClick={() => open("menu")}
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      {openList && (message || suggest === "loading" || results.length > 0) && (
        <div
          id={listId}
          role="listbox"
          className="glass glass-flat absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-80 overflow-auto p-2"
        >
          {suggest === "loading" && <p className="px-3 py-2 text-sm text-white/70">Searching places…</p>}
          {results.map((place, index) => (
            <button
              key={place.id}
              type="button"
              role="option"
              aria-selected={index === highlight}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => choose(place)}
              className={`flex w-full flex-col rounded-2xl px-3 py-2.5 text-left ${
                index === highlight ? "bg-white/15" : "hover:bg-white/10"
              }`}
            >
              <span className="font-medium">{place.name}</span>
              <span className="text-sm text-white/60">{placeLine(place)}</span>
            </button>
          ))}
          {message && suggest !== "loading" && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-white/75" data-testid="search-status">
              {message}
            </p>
          )}
        </div>
      )}
      <p className="sr-only" role="status" data-testid="search-status-live">
        {message}
      </p>
    </div>
  );
}
