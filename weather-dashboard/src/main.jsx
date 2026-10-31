import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppState } from "./context";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppState>
      <App />
    </AppState>
  </StrictMode>,
);
