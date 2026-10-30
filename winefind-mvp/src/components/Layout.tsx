import { NavLink, Outlet } from "react-router-dom";
import { useApp } from "../state/AppContext";

export function Layout() {
  const { state } = useApp();
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Vint<span>ly</span>
        </NavLink>
        <NavLink to="/account" className="muted" style={{ fontSize: "0.85rem", textDecoration: "none" }}>
          {state.premium ? "Premium" : state.email ? state.displayName || "Account" : "Sign in"}
        </NavLink>
      </header>
      <nav className="nav-tabs" aria-label="Primary">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/scan">Scan</NavLink>
        <NavLink to="/menu">Menu</NavLink>
        <NavLink to="/find">Find</NavLink>
        <NavLink to="/profile">Palate</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
