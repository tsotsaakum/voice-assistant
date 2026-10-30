import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../state/AppContext";

export function Account() {
  const { state, signIn, signOut, activatePremium } = useApp();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  return (
    <>
      <h2 className="section-title">Account & Premium</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Demo auth stores locally in your browser (sync badge for Premium). Not a
        real App Store IAP — simulates Wine Find monthly/annual gates.
      </p>

      <div className="card">
        <h3>{state.email ? "Signed in" : "Sign in"}</h3>
        {state.email ? (
          <>
            <p>
              {state.displayName} · {state.email}
            </p>
            <p className="muted" style={{ marginTop: 6 }}>
              Saved wines sync locally{state.premium ? " · Premium sync enabled" : ""}.
            </p>
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="name">Display name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!email.trim() || !name.trim()}
              onClick={() => signIn(email.trim(), name.trim())}
            >
              Create local account
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h3>Vintly Premium</h3>
        <ul className="list-clean">
          <li>Unlimited label & menu scans</li>
          <li>Unlimited Find Wine + menu constraints</li>
          <li>Extreme-markup alerts</li>
          <li>Premium sync badge on saved wines</li>
        </ul>
        {state.premium ? (
          <p style={{ marginTop: 12 }}>
            Active: {state.premiumPlan === "annual" ? "Annual ($49.99)" : "Monthly ($4.99)"} demo
          </p>
        ) : (
          <div className="stack-gap">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => activatePremium("monthly")}
            >
              Monthly Premium — $4.99
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => activatePremium("annual")}
            >
              Annual Premium — $49.99
            </button>
          </div>
        )}
      </div>

      <p className="muted">
        <Link to="/privacy">Privacy policy</Link> · <Link to="/compliance">Compliance</Link>
      </p>
    </>
  );
}
