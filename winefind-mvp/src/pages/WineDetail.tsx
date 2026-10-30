import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  averageCriticScore,
  displayVintage,
  getWineById,
} from "../data/wines";
import { classifyMarkup, formatUsd } from "../lib/markup";
import { useApp } from "../state/AppContext";

export function WineDetail() {
  const { id } = useParams();
  const wine = getWineById(id ?? "");
  const { state, toggleLike, toggleSaved, addNote, rateWine } = useApp();
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(state.ratings[id ?? ""] ?? 4);
  const [menuPrice, setMenuPrice] = useState<number | "">("");

  const markup = useMemo(() => {
    if (!wine || menuPrice === "") return null;
    return classifyMarkup(Number(menuPrice), wine.marketPriceUsd);
  }, [wine, menuPrice]);

  if (!wine) {
    return (
      <div className="blank-state">
        Wine not found. <Link to="/">Go home</Link>
      </div>
    );
  }

  const liked = state.likedWineIds.includes(wine.id);
  const saved = state.savedWineIds.includes(wine.id);
  const score = averageCriticScore(wine);

  return (
    <>
      <p className="muted">
        <Link to="/">← Back</Link>
      </p>
      <section className="hero-panel">
        <div className="wine-row">
          <div className="score-ring" style={{ width: 72, height: 72, fontSize: "1.25rem" }}>
            {score}
          </div>
          <div>
            <h1 style={{ fontSize: "1.85rem" }}>
              {wine.producer}
              <br />
              {wine.name}
            </h1>
            <p>
              {displayVintage(wine)} · {wine.region}, {wine.country}
            </p>
          </div>
        </div>
        <div className="pill-row">
          <span className="pill">{wine.style}</span>
          {wine.grapes.map((g) => (
            <span className="pill" key={g}>
              {g}
            </span>
          ))}
          {wine.vineyard && <span className="pill">{wine.vineyard}</span>}
        </div>
      </section>

      <div className="card">
        <h3>Tasting notes</h3>
        <p className="muted">{wine.tastingNotes}</p>
        <div className="pill-row">
          {wine.aromas.map((a) => (
            <span className="pill" key={a}>
              {a}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Critic scores</h3>
        <ul className="list-clean">
          {wine.criticScores.map((c) => (
            <li key={c.source}>
              {c.source}: <strong style={{ color: "var(--ink)" }}>{c.score}</strong>
            </li>
          ))}
        </ul>
        <p className="muted" style={{ marginTop: 8 }}>
          Market price {formatUsd(wine.marketPriceUsd)}
        </p>
      </div>

      <div className="card">
        <h3>Smart savings / markup</h3>
        <div className="field">
          <label htmlFor="menuPrice">Menu or shelf price (USD)</label>
          <input
            id="menuPrice"
            type="number"
            min={0}
            value={menuPrice}
            onChange={(e) => setMenuPrice(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="e.g. 95"
          />
        </div>
        {markup && (
          <>
            <span className={`pill ${markup.tier}`}>
              {markup.label} · {markup.ratio.toFixed(1)}×
            </span>
            <p className="muted" style={{ marginTop: 8 }}>
              {markup.savingsHint}
            </p>
            {markup.tier === "extreme" && !state.premium && (
              <p className="muted" style={{ marginTop: 8 }}>
                Extreme-markup alerts are a Premium feature.{" "}
                <Link to="/account">Upgrade</Link>
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h3>Food pairings</h3>
        <div className="pill-row">
          {wine.foodPairings.map((f) => (
            <span className="pill" key={f}>
              {f}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Your take</h3>
        <div className="stack-gap" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => toggleLike(wine.id)}>
            {liked ? "Liked ✓" : "Like for taste profile"}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => toggleSaved(wine.id)}>
            {saved ? "Saved ✓" : "Save wine"}
          </button>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Rating</label>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={n <= rating ? "on" : ""}
                onClick={() => {
                  setRating(n);
                  rateWine(wine.id, n);
                }}
                aria-label={`${n} stars`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="note">Tasting note</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you taste?"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!note.trim()}
          onClick={() => {
            addNote(wine.id, rating, note.trim());
            setNote("");
          }}
        >
          Save note
        </button>
        {state.notes.filter((n) => n.wineId === wine.id).map((n) => (
          <div key={n.id} style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <p className="muted">
              {n.rating}★ · {new Date(n.createdAt).toLocaleString()}
            </p>
            <p>{n.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
