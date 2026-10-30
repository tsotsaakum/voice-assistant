import { Link } from "react-router-dom";

export function Compliance() {
  return (
    <>
      <p className="muted">
        <Link to="/">← Home</Link>
      </p>
      <h2 className="section-title">Compliance & launch checklist</h2>
      <div className="card">
        <h3>Age rating</h3>
        <p className="muted">
          18+ age gate on first launch. Content frequently references alcohol
          (Food & Drink / alcohol category equivalent to App Store 18+).
        </p>
      </div>
      <div className="card">
        <h3>App Store Food & Drink guidelines</h3>
        <ul className="list-clean">
          <li>Accurate IAP pricing disclosure ($4.99 / $49.99 demo)</li>
          <li>Privacy policy URL linked in-app</li>
          <li>No sale of alcohol inside the demo (discovery only)</li>
          <li>Restore-purchases note required before native StoreKit ship</li>
        </ul>
      </div>
      <div className="card">
        <h3>QA covered in this repo</h3>
        <ul className="list-clean">
          <li>Empty / failed label scan</li>
          <li>Menu OCR match + markup tiers (fair / steep / extreme)</li>
          <li>Find Wine ranking & budget parse</li>
          <li>Freemium gate counters</li>
        </ul>
      </div>
      <div className="card">
        <h3>Launch assets</h3>
        <p className="muted">
          See <code>LAUNCH.md</code> for onboarding copy, screenshot script, and
          listing metadata mirroring Wine Find’s store presence.
        </p>
      </div>
    </>
  );
}
