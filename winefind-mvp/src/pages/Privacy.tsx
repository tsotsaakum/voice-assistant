import { Link } from "react-router-dom";

export function Privacy() {
  return (
    <>
      <p className="muted">
        <Link to="/">← Home</Link>
      </p>
      <h2 className="section-title">Privacy Policy (MVP)</h2>
      <div className="card">
        <p className="muted">
          Vintly is a local demo. Account email, tasting notes, likes, and scan
          counters are stored in your browser via localStorage. We do not operate
          a production backend in this MVP and do not sell personal data.
        </p>
        <ul className="list-clean">
          <li>Data collected: optional display name/email, wine notes, ratings, usage counters</li>
          <li>Purpose: provide the pocket-sommelier demo features you request</li>
          <li>Retention: until you clear site data or sign out (premium flags cleared on sign-out)</li>
          <li>Third parties: none in this demo build</li>
          <li>Contact: privacy@vintly.demo (placeholder)</li>
        </ul>
      </div>
    </>
  );
}
