import { useState } from "react";
import { Link } from "react-router-dom";
import { WineCard } from "../components/WineCard";
import {
  extractTextFromScanInput,
  matchLabelScan,
  searchWinesManual,
  type LabelScanResult,
} from "../lib/scan";
import { useApp } from "../state/AppContext";
import type { Wine } from "../data/wines";

export function Scan() {
  const { labelScanGate, recordLabelScan, state } = useApp();
  const [pasted, setPasted] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [result, setResult] = useState<LabelScanResult | null>(null);
  const [manual, setManual] = useState("");
  const [manualHits, setManualHits] = useState<Wine[]>([]);
  const [blocked, setBlocked] = useState(false);

  function runScan(opts: { pastedText?: string; fileName?: string; useSampleLabel?: boolean }) {
    if (!recordLabelScan()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    const raw = extractTextFromScanInput(opts);
    setResult(matchLabelScan(raw));
  }

  return (
    <>
      <h2 className="section-title">Label scan</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Demo vision: upload a photo (filename used as OCR hint), paste label text, or try a sample.
        {!state.premium && ` ${labelScanGate.remaining} free scans left this week.`}
      </p>

      {blocked && (
        <div className="upgrade-banner">
          <strong>Scan limit reached</strong>
          <p className="muted">
            Free plan allows 3 label scans per week. <Link to="/account">Upgrade to Premium</Link>
          </p>
        </div>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="photo">Photo of label</label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileName(f?.name);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="ocr">Or paste OCR / label text</label>
          <textarea
            id="ocr"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="e.g. Raats Chenin Blanc Bush Vine 2023"
          />
        </div>
        <div className="stack-gap">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() =>
              runScan({
                pastedText: pasted,
                fileName,
              })
            }
          >
            Match label
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => runScan({ useSampleLabel: true })}
          >
            Use sample Sancerre label
          </button>
        </div>
      </div>

      {result && (
        <div className="card">
          <h3>Scan result</h3>
          <p className="muted">OCR: {result.rawText || "(empty)"}</p>
          {result.empty && <p className="blank-state">No text detected — try paste or sample.</p>}
          {!result.empty && !result.wine && (
            <p className="muted" style={{ marginTop: 8 }}>
              No confident match. Use manual search below.
            </p>
          )}
          {result.wine && (
            <div style={{ marginTop: 12 }}>
              <WineCard wine={result.wine} confidence={result.confidence} />
            </div>
          )}
        </div>
      )}

      <h2 className="section-title">Manual search fallback</h2>
      <div className="card">
        <div className="field">
          <label htmlFor="manual">Search catalog</label>
          <input
            id="manual"
            value={manual}
            onChange={(e) => {
              setManual(e.target.value);
              setManualHits(searchWinesManual(e.target.value));
            }}
            placeholder="Producer, grape, region…"
          />
        </div>
        {manualHits.map((w) => (
          <WineCard key={w.id} wine={w} />
        ))}
      </div>
    </>
  );
}
