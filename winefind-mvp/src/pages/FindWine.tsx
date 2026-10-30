import { useState } from "react";
import { Link } from "react-router-dom";
import { WINES } from "../data/wines";
import { WineCard } from "../components/WineCard";
import { findWines, type FindWineMatch } from "../lib/findWine";
import { useApp } from "../state/AppContext";

const EXAMPLES = [
  "crisp white from a cool climate region, pairs well with oysters, under $30",
  "bold red for steak under $40",
  "sparkling for celebration",
  "South African Chenin with roast chicken",
];

export function FindWine() {
  const { state, findGate, recordFindQuery } = useApp();
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [constrain, setConstrain] = useState(true);
  const [matches, setMatches] = useState<FindWineMatch[] | null>(null);
  const [blocked, setBlocked] = useState(false);

  function run(q = query) {
    if (!recordFindQuery()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    const wineIds =
      constrain && state.activeMenuWineIds.length > 0
        ? state.activeMenuWineIds
        : undefined;
    if (constrain && wineIds && !state.premium && state.activeMenuWineIds.length > 0) {
      // Free users can still constrain in demo after a menu scan; Premium messaging for unlimited
    }
    setMatches(findWines(WINES, { text: q, wineIds }));
  }

  return (
    <>
      <h2 className="section-title">Find Wine</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Describe style, food, or budget in plain language.
        {!state.premium && ` ${findGate.remaining} free queries left today.`}
      </p>

      {blocked && (
        <div className="upgrade-banner">
          <strong>Daily Find Wine limit reached</strong>
          <p className="muted">
            <Link to="/account">Go Premium</Link> for unlimited queries and saved menu constraints.
          </p>
        </div>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="q">What are you looking for?</label>
          <textarea id="q" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={constrain}
            onChange={(e) => setConstrain(e.target.checked)}
          />
          Limit to active scanned menu
          {state.activeMenuWineIds.length === 0 ? " (scan a menu first)" : ` (${state.activeMenuWineIds.length} wines)`}
        </label>
        <button type="button" className="btn btn-primary btn-block" onClick={() => run()}>
          Find matches
        </button>
        <div className="pill-row">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="pill"
              style={{ cursor: "pointer", border: "none" }}
              onClick={() => {
                setQuery(ex);
                run(ex);
              }}
            >
              {ex.slice(0, 28)}…
            </button>
          ))}
        </div>
      </div>

      {matches && matches.length === 0 && (
        <p className="blank-state">No matches — broaden your description or clear menu constraint.</p>
      )}
      {matches?.map((m) => (
        <WineCard key={m.wine.id} wine={m.wine} reasons={m.reasons} />
      ))}
    </>
  );
}
