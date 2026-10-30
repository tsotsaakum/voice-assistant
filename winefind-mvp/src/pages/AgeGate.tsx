import { useApp } from "../state/AppContext";

export function AgeGate() {
  const { confirmAge } = useApp();
  return (
    <div className="app-shell">
      <div className="gate-screen">
        <p className="muted" style={{ marginBottom: 8 }}>
          Vintly
        </p>
        <h1>Are you of legal drinking age?</h1>
        <p className="muted">
          This app covers wine reviews, scores, and alcohol recommendations. You
          must be 18 or older to continue.
        </p>
        <div className="stack-gap">
          <button type="button" className="btn btn-primary btn-block" onClick={confirmAge}>
            I am 18 or older
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => {
              window.location.href = "https://www.responsibility.org/";
            }}
          >
            I am under 18 — exit
          </button>
        </div>
      </div>
    </div>
  );
}
