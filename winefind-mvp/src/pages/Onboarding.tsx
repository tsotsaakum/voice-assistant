import { useApp } from "../state/AppContext";

const STEPS = [
  {
    title: "Scan any label or list",
    body: "Reveal critic scores, tasting notes, region info, and true market price so you never overpay.",
  },
  {
    title: "Map your palate",
    body: "Like a few wines and Vintly turns “I know what I like” into clear flavor notes and recommendations.",
  },
  {
    title: "Find wine in plain language",
    body: "Ask for a crisp white for oysters under $30 — or constrain results to the menu you just scanned.",
  },
];

export function Onboarding() {
  const { completeOnboarding } = useApp();
  return (
    <div className="app-shell">
      <div className="hero-panel" style={{ marginTop: 28 }}>
        <h1>Your pocket sommelier</h1>
        <p>Restaurant lists and retail shelves, decoded in seconds.</p>
      </div>
      {STEPS.map((step, i) => (
        <div className="card" key={step.title} style={{ animationDelay: `${i * 80}ms` }}>
          <p className="muted" style={{ marginBottom: 4 }}>
            Step {i + 1}
          </p>
          <h3>{step.title}</h3>
          <p className="muted">{step.body}</p>
        </div>
      ))}
      <button type="button" className="btn btn-primary btn-block" onClick={completeOnboarding}>
        Start exploring
      </button>
    </div>
  );
}
