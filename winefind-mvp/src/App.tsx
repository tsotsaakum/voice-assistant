import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Account } from "./pages/Account";
import { AgeGate } from "./pages/AgeGate";
import { Articles } from "./pages/Articles";
import { Brief } from "./pages/Brief";
import { Compliance } from "./pages/Compliance";
import { FindWine } from "./pages/FindWine";
import { Home } from "./pages/Home";
import { MenuScan } from "./pages/MenuScan";
import { Onboarding } from "./pages/Onboarding";
import { Privacy } from "./pages/Privacy";
import { Scan } from "./pages/Scan";
import { TasteProfilePage } from "./pages/TasteProfilePage";
import { WineDetail } from "./pages/WineDetail";
import { AppProvider, useApp } from "./state/AppContext";

function Gate() {
  const { state } = useApp();
  if (!state.ageConfirmed) return <AgeGate />;
  if (!state.onboardingDone) return <Onboarding />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="scan" element={<Scan />} />
        <Route path="menu" element={<MenuScan />} />
        <Route path="find" element={<FindWine />} />
        <Route path="profile" element={<TasteProfilePage />} />
        <Route path="wine/:id" element={<WineDetail />} />
        <Route path="account" element={<Account />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="brief" element={<Brief />} />
        <Route path="articles" element={<Articles />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AppProvider>
  );
}
