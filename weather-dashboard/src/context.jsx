import { createContext, useContext, useEffect, useRef, useState } from "react";
import { fetchReport } from "./lib/weather";
import { sampleReport } from "./lib/sample";
import { readJSON, writeJSON } from "./lib/storage";

const WeatherContext = createContext(null);
const UnitsContext = createContext(null);
const CaptureContext = createContext(null);

export function AppState({ children }) {
  const [report, setReport] = useState(() => sampleReport());
  const [status, setStatus] = useState("refreshing");
  const [error, setError] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [units, setUnits] = useState(() => (readJSON("units", "c") === "f" ? "f" : "c"));
  const [capture, setCapture] = useState(null);
  const request = useRef(0);
  const reportRef = useRef(report);
  reportRef.current = report;

  async function loadPlace(place, { soft = false } = {}) {
    const id = ++request.current;
    setPendingName(place.name);
    setStatus(soft ? "refreshing" : "loading");
    setError("");
    try {
      const next = await fetchReport(place);
      if (id !== request.current) return;
      setReport(next);
      setPendingName("");
      setStatus("ready");
      const recent = readJSON("recent", []);
      const filtered = recent.filter((item) => item.id !== next.place.id);
      writeJSON("recent", [next.place, ...filtered].slice(0, 6));
    } catch {
      if (id !== request.current) return;
      setStatus("error");
      const current = reportRef.current;
      setError(
        soft && current?.source === "sample"
          ? "Live weather did not load. Showing a Shanghai sample until you search."
          : `Found ${place.name}, but the forecast did not load. Try again.`,
      );
    }
  }

  useEffect(() => {
    loadPlace(sampleReport().place, { soft: true });
  }, []);

  const changeUnits = (next) => {
    setUnits(next);
    writeJSON("units", next);
  };

  return (
    <WeatherContext.Provider
      value={{
        report,
        status,
        error,
        loadPlace,
        pendingName,
        retry: () => loadPlace(report.place),
      }}
    >
      <UnitsContext.Provider value={{ units, setUnits: changeUnits }}>
        <CaptureContext.Provider value={{ capture, open: setCapture, close: () => setCapture(null) }}>
          {children}
        </CaptureContext.Provider>
      </UnitsContext.Provider>
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  return useContext(WeatherContext);
}

export function useUnits() {
  return useContext(UnitsContext);
}

export function useCapture() {
  return useContext(CaptureContext);
}
