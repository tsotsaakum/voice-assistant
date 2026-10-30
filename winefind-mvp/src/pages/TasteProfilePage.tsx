import { Link } from "react-router-dom";
import { getWineById } from "../data/wines";
import { WineCard } from "../components/WineCard";
import { buildTasteProfile } from "../lib/tasteProfile";
import { useApp } from "../state/AppContext";

export function TasteProfilePage() {
  const { state } = useApp();
  const profile = buildTasteProfile(state);
  const hasSignal =
    state.likedWineIds.length > 0 || Object.keys(state.ratings).length > 0;

  return (
    <>
      <h2 className="section-title">Taste profile</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Like and rate bottles to map your palate. Recommendations update as you go.
      </p>

      {!hasSignal && (
        <div className="card">
          <h3>Start your map</h3>
          <p className="muted">
            Open a wine and tap Like, or leave a star rating. Try the{" "}
            <Link to="/scan">sample Sancerre scan</Link>.
          </p>
        </div>
      )}

      {hasSignal && (
        <>
          <div className="card">
            <h3>Flavor notes</h3>
            <div className="pill-row">
              {profile.topFlavors.map((f) => (
                <span className="pill" key={f.tag}>
                  {f.tag}
                </span>
              ))}
              {profile.topFlavors.length === 0 && (
                <span className="muted">Rate more wines to unlock flavors.</span>
              )}
            </div>
            <h3 style={{ marginTop: 14 }}>Aromas</h3>
            <div className="pill-row">
              {profile.topAromas.map((a) => (
                <span className="pill" key={a.tag}>
                  {a.tag}
                </span>
              ))}
            </div>
            <h3 style={{ marginTop: 14 }}>Styles & regions</h3>
            <div className="pill-row">
              {profile.preferredStyles.map((s) => (
                <span className="pill" key={s.style}>
                  {s.style}
                </span>
              ))}
              {profile.preferredRegions.map((r) => (
                <span className="pill" key={r.region}>
                  {r.region}
                </span>
              ))}
            </div>
          </div>

          <h2 className="section-title">Recommended for you</h2>
          {profile.recommendations.map((w) => (
            <WineCard key={w.id} wine={w} />
          ))}
          {profile.recommendations.length === 0 && (
            <p className="blank-state">Keep liking wines to get recommendations.</p>
          )}
        </>
      )}

      <h2 className="section-title">Notes history</h2>
      {state.notes.length === 0 && <p className="blank-state">No tasting notes yet.</p>}
      {state.notes.map((n) => {
        const wine = getWineById(n.wineId);
        return (
          <div className="card" key={n.id}>
            <h3>
              <Link to={`/wine/${n.wineId}`}>
                {wine ? `${wine.producer} ${wine.name}` : n.wineId}
              </Link>
            </h3>
            <p className="muted">
              {n.rating}★ · {new Date(n.createdAt).toLocaleString()}
            </p>
            <p>{n.body}</p>
          </div>
        );
      })}

      <h2 className="section-title">Saved wines</h2>
      {state.savedWineIds.length === 0 && <p className="muted">Nothing saved yet.</p>}
      {state.savedWineIds.map((id) => {
        const wine = getWineById(id);
        return wine ? <WineCard key={id} wine={wine} /> : null;
      })}
    </>
  );
}
