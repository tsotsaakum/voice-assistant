import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useCapture } from "../context";
import { useStored } from "../lib/storage";

const TITLES = {
  menu: "Quick record",
  expense: "Record an expense",
  calories: "Log energy",
  idea: "Save an idea",
};

export default function CaptureSheet() {
  const { capture, open, close } = useCapture();
  const [, setExpenses] = useStored("expenses", []);
  const [, setCalories] = useStored("calories", []);
  const [, setJournal] = useStored("journal", []);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ label: "", amount: "", kcal: "", protein: "", fat: "", water: "", text: "" });

  useEffect(() => {
    setError("");
    setForm({ label: "", amount: "", kcal: "", protein: "", fat: "", water: "", text: "" });
  }, [capture]);

  if (!capture) return null;

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveExpense(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.label.trim()) {
      setError("Name the expense.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setExpenses((items) => [
      { id: crypto.randomUUID(), label: form.label.trim(), amount, at: new Date().toISOString() },
      ...(Array.isArray(items) ? items : []),
    ]);
    close();
  }

  function saveCalories(event) {
    event.preventDefault();
    const kcal = Number(form.kcal);
    if (!form.label.trim()) {
      setError("Name what you logged.");
      return;
    }
    if (!Number.isFinite(kcal) || kcal < 0) {
      setError("Enter calories as a number, zero or more.");
      return;
    }
    const protein = Number(form.protein) || 0;
    const fat = Number(form.fat) || 0;
    const water = Number(form.water) || 0;
    if (kcal === 0 && protein === 0 && fat === 0 && water === 0) {
      setError("Add calories, protein, fat, or water.");
      return;
    }
    setCalories((items) => [
      {
        id: crypto.randomUUID(),
        label: form.label.trim(),
        kcal,
        protein,
        fat,
        water,
        at: new Date().toISOString(),
      },
      ...(Array.isArray(items) ? items : []),
    ]);
    close();
  }

  function saveIdea(event) {
    event.preventDefault();
    if (!form.text.trim()) {
      setError("Write the idea first.");
      return;
    }
    setJournal((items) => [
      { id: crypto.randomUUID(), text: form.text.trim(), at: new Date().toISOString() },
      ...(Array.isArray(items) ? items : []),
    ]);
    close();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close quick record" onClick={close} />
      <div className="glass relative z-10 w-full max-w-md p-5" role="dialog" aria-modal="true" aria-labelledby="capture-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="capture-title" className="font-serif text-2xl">
            {TITLES[capture] || "Quick record"}
          </h2>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Close" onClick={close}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {capture === "menu" && (
          <div className="grid gap-2">
            {[
              ["expense", "Record an expense"],
              ["calories", "Log energy"],
              ["idea", "Save an idea"],
            ].map(([id, label]) => (
              <button key={id} type="button" className="rounded-2xl bg-white/10 px-4 py-3 text-left hover:bg-white/15" onClick={() => open(id)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {capture === "expense" && (
          <form onSubmit={saveExpense} className="grid gap-3">
            <input className="rounded-2xl bg-white/10 px-3 py-2 outline-none" placeholder="Coffee" value={form.label} onChange={(event) => setField("label", event.target.value)} />
            <input className="rounded-2xl bg-white/10 px-3 py-2 outline-none" placeholder="Amount in ¥" inputMode="decimal" value={form.amount} onChange={(event) => setField("amount", event.target.value)} />
            <Submit error={error} label="Save expense" />
          </form>
        )}
        {capture === "calories" && (
          <form onSubmit={saveCalories} className="grid gap-3">
            <input className="rounded-2xl bg-white/10 px-3 py-2 outline-none" placeholder="Lunch" value={form.label} onChange={(event) => setField("label", event.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-2xl bg-white/10 px-3 py-2 outline-none" placeholder="kcal" inputMode="decimal" value={form.kcal} onChange={(event) => setField("kcal", event.target.value)} />
              <input className="rounded-2xl bg-white/10 px-3 py-2 outline-none" placeholder="Water ml" inputMode="decimal" value={form.water} onChange={(event) => setField("water", event.target.value)} />
              <input className="rounded-2xl bg-white/10 px-3 py-2 outline-none" placeholder="Protein g" inputMode="decimal" value={form.protein} onChange={(event) => setField("protein", event.target.value)} />
              <input className="rounded-2xl bg-white/10 px-3 py-2 outline-none" placeholder="Fat g" inputMode="decimal" value={form.fat} onChange={(event) => setField("fat", event.target.value)} />
            </div>
            <Submit error={error} label="Save log" />
          </form>
        )}
        {capture === "idea" && (
          <form onSubmit={saveIdea} className="grid gap-3">
            <textarea className="min-h-28 rounded-2xl bg-white/10 px-3 py-2 outline-none" placeholder="A thought to keep" value={form.text} onChange={(event) => setField("text", event.target.value)} />
            <Submit error={error} label="Save idea" />
          </form>
        )}
      </div>
    </div>
  );
}

function Submit({ error, label }) {
  return (
    <>
      {error && <p className="text-sm text-[#ffb4a2]">{error}</p>}
      <button type="submit" className="coral rounded-full px-4 py-2 text-sm font-medium">
        {label}
      </button>
    </>
  );
}
