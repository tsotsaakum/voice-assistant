import { useState } from "react";
import { Link } from "react-router-dom";
import { DEMO_MENUS } from "../data/wines";
import { WineCard } from "../components/WineCard";
import { classifyMarkup } from "../lib/markup";
import { matchMenuScan, type MenuScanResult } from "../lib/scan";
import { useApp } from "../state/AppContext";

export function MenuScan() {
  const { menuScanGate, recordMenuScan, setActiveMenu, state } = useApp();
  const [menuId, setMenuId] = useState(DEMO_MENUS[0].id);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<MenuScanResult | null>(null);
  const [blocked, setBlocked] = useState(false);

  function run(useDemo: boolean) {
    if (!recordMenuScan()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    const demo = DEMO_MENUS.find((m) => m.id === menuId)!;
    const raw = useDemo ? demo.ocrText : pasted;
    const scanned = matchMenuScan(raw, useDemo ? menuId : undefined);
    setResult(scanned);
    setActiveMenu(
      scanned.menu?.id ?? null,
      scanned.matches.map((m) => m.wine.id),
    );
  }

  const extremeCount =
    result?.matches.filter(
      (m) => classifyMarkup(m.menuPriceUsd, m.wine.marketPriceUsd).tier === "extreme",
    ).length ?? 0;

  return (
    <>
      <h2 className="section-title">Menu / wine-list scan</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Extract multiple bottles, batch scores, and flag restaurant markups.
        {!state.premium && ` Free: ${menuScanGate.remaining} menu scan remaining.`}
      </p>

      {blocked && (
        <div className="upgrade-banner">
          <strong>Menu scan limit reached</strong>
          <p className="muted">
            <Link to="/account">Upgrade to Premium</Link> for unlimited lists.
          </p>
        </div>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="menu">Demo restaurant list</label>
          <select id="menu" value={menuId} onChange={(e) => setMenuId(e.target.value)}>
            {DEMO_MENUS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.restaurant} — {m.city}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={() => run(true)}>
          Scan demo menu
        </button>
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="paste-menu">Or paste menu OCR</label>
          <textarea
            id="paste-menu"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste wine list text…"
          />
        </div>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => run(false)}>
          Parse pasted list
        </button>
      </div>

      {result && (
        <>
          <div className="card">
            <h3>{result.menu ? result.menu.restaurant : "Parsed list"}</h3>
            <p className="muted">
              {result.matches.length} wines matched
              {result.empty ? " — empty OCR" : ""}.
              {extremeCount > 0 && state.premium
                ? ` ${extremeCount} extreme markup alert(s).`
                : extremeCount > 0
                  ? ` ${extremeCount} extreme markups (Premium unlocks alerts).`
                  : ""}
            </p>
            {state.activeMenuWineIds.length > 0 && (
              <p className="muted" style={{ marginTop: 8 }}>
                Active menu saved for <Link to="/find">Find Wine</Link> constraints.
              </p>
            )}
          </div>
          {result.matches
            .slice()
            .sort((a, b) => {
              const ra = classifyMarkup(a.menuPriceUsd, a.wine.marketPriceUsd).ratio;
              const rb = classifyMarkup(b.menuPriceUsd, b.wine.marketPriceUsd).ratio;
              return rb - ra;
            })
            .map((m) => (
              <WineCard
                key={m.wine.id}
                wine={m.wine}
                menuPriceUsd={m.menuPriceUsd}
                confidence={m.confidence}
              />
            ))}
          {result.unmatchedLines.length > 0 && (
            <div className="card">
              <h3>Unmatched lines</h3>
              <ul className="list-clean">
                {result.unmatchedLines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}
