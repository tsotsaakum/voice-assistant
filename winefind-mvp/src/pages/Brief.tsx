import { Link } from "react-router-dom";

export function Brief() {
  return (
    <>
      <p className="muted">
        <Link to="/">← Home</Link>
      </p>
      <h2 className="section-title">Product brief</h2>
      <div className="card">
        <p className="muted">
          Full brief lives in <code>PRODUCT_BRIEF.md</code>. Summary:
        </p>
        <ul className="list-clean">
          <li>18+ age gate; restaurant + retail jobs</li>
          <li>Scan → scores/notes/price → taste profile → Find Wine → markup</li>
          <li>Freemium: 3 scans/week, 1 menu scan, 3 Find queries/day</li>
          <li>Premium: $4.99/mo or $49.99/yr (demo unlock)</li>
        </ul>
      </div>
    </>
  );
}
