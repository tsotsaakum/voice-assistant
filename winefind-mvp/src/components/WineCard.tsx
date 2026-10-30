import { Link } from "react-router-dom";
import {
  averageCriticScore,
  displayVintage,
  type Wine,
} from "../data/wines";
import { classifyMarkup, formatUsd } from "../lib/markup";

interface Props {
  wine: Wine;
  menuPriceUsd?: number;
  reasons?: string[];
  confidence?: number;
}

export function WineCard({ wine, menuPriceUsd, reasons, confidence }: Props) {
  const score = averageCriticScore(wine);
  const markup =
    menuPriceUsd !== undefined
      ? classifyMarkup(menuPriceUsd, wine.marketPriceUsd)
      : null;

  return (
    <Link to={`/wine/${wine.id}`} className="card" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
      <div className="wine-row">
        <div className="score-ring">{score || "—"}</div>
        <div style={{ flex: 1 }}>
          <h3>
            {wine.producer} {wine.name}
          </h3>
          <p className="muted">
            {displayVintage(wine)} · {wine.region}, {wine.country}
          </p>
          <div className="pill-row">
            <span className="pill">{wine.style}</span>
            <span className="pill">Market {formatUsd(wine.marketPriceUsd)}</span>
            {menuPriceUsd !== undefined && (
              <span className="pill">Menu {formatUsd(menuPriceUsd)}</span>
            )}
            {markup && <span className={`pill ${markup.tier}`}>{markup.label} {markup.ratio.toFixed(1)}×</span>}
            {confidence !== undefined && (
              <span className="pill">{Math.round(confidence * 100)}% match</span>
            )}
          </div>
          {reasons && reasons.length > 0 && (
            <p className="muted" style={{ marginTop: 8 }}>
              {reasons.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
