import { Link } from "react-router-dom";
import { WINES } from "../data/wines";
import { WineCard } from "../components/WineCard";
import { useApp } from "../state/AppContext";

export function Home() {
  const { state, labelScanGate, findGate } = useApp();
  const featured = WINES.slice(0, 3);

  return (
    <>
      <section className="hero-panel">
        <h1>Never guess the list again</h1>
        <p>
          Scan a bottle or menu, spot markups, and find the bottle that matches
          your taste — not the jargon.
        </p>
        <div className="stack-gap">
          <Link to="/scan" className="btn btn-primary btn-block" style={{ textDecoration: "none" }}>
            Scan a label
          </Link>
          <Link to="/menu" className="btn btn-ghost btn-block" style={{ textDecoration: "none" }}>
            Scan a wine list
          </Link>
        </div>
      </section>

      {!state.premium && (
        <div className="upgrade-banner">
          <strong>Free plan</strong>
          <p className="muted">
            {labelScanGate.remaining === Infinity ? "∞" : labelScanGate.remaining} label scans left
            this week · {findGate.remaining === Infinity ? "∞" : findGate.remaining} Find Wine
            queries today.{" "}
            <Link to="/account">Go Premium</Link>
          </p>
        </div>
      )}

      <h2 className="section-title">Featured bottles</h2>
      {featured.map((w) => (
        <WineCard key={w.id} wine={w} />
      ))}

      <div className="card">
        <h3>Similar apps & shops</h3>
        <p className="muted" style={{ marginBottom: 8 }}>
          Competitive landscape for this MVP demo.
        </p>
        <ul className="list-clean">
          <li>
            <a href="https://apps.apple.com/app/id6740998562" target="_blank" rel="noreferrer">
              Wine Find (reference)
            </a>
          </li>
          <li>
            <a href="https://www.vivino.com" target="_blank" rel="noreferrer">
              Vivino
            </a>{" "}
            ·{" "}
            <a href="https://www.wine-searcher.com" target="_blank" rel="noreferrer">
              Wine-Searcher
            </a>
          </li>
          <li>
            <a href="https://decanta.co.za/" target="_blank" rel="noreferrer">
              Decanta
            </a>{" "}
            ·{" "}
            <a href="https://getpale.co.za/" target="_blank" rel="noreferrer">
              Palé
            </a>
          </li>
          <li>
            <a href="https://www.cybercellar.com" target="_blank" rel="noreferrer">
              Cybercellar
            </a>{" "}
            ·{" "}
            <a href="https://www.winecellar.co.za" target="_blank" rel="noreferrer">
              Wine Cellar SA
            </a>
          </li>
        </ul>
        <p className="muted" style={{ marginTop: 10 }}>
          <Link to="/privacy">Privacy</Link> · <Link to="/compliance">Compliance</Link> ·{" "}
          <Link to="/brief">Product brief</Link> · <Link to="/articles">Scholar articles</Link>
        </p>
      </div>
    </>
  );
}
