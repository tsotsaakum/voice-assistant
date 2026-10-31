import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "lentswe-glass-weather:";

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("lentswe-store", { detail: key }));
}

export function useStored(key, fallback) {
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const [value, setValue] = useState(() => readJSON(key, fallback));

  useEffect(() => {
    const sync = (event) => {
      if (event?.detail && event.detail !== key) return;
      setValue(readJSON(key, fallbackRef.current));
    };
    window.addEventListener("lentswe-store", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("lentswe-store", sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  const update = useCallback((next) => {
    const resolved = typeof next === "function" ? next(readJSON(key, fallbackRef.current)) : next;
    writeJSON(key, resolved);
    setValue(resolved);
  }, [key]);

  return [value, update];
}
