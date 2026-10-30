import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  canFindWine,
  canLabelScan,
  canMenuScan,
  loadState,
  saveState,
  type TastingNote,
  type UserState,
} from "../lib/storage";

interface AppContextValue {
  state: UserState;
  setState: (updater: (s: UserState) => UserState) => void;
  confirmAge: () => void;
  completeOnboarding: () => void;
  signIn: (email: string, displayName: string) => void;
  signOut: () => void;
  activatePremium: (plan: "monthly" | "annual") => void;
  recordLabelScan: () => boolean;
  recordMenuScan: () => boolean;
  recordFindQuery: () => boolean;
  toggleLike: (wineId: string) => void;
  rateWine: (wineId: string, rating: number) => void;
  addNote: (wineId: string, rating: number, body: string) => void;
  toggleSaved: (wineId: string) => void;
  setActiveMenu: (menuId: string | null, wineIds: string[]) => void;
  labelScanGate: ReturnType<typeof canLabelScan>;
  menuScanGate: ReturnType<typeof canMenuScan>;
  findGate: ReturnType<typeof canFindWine>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<UserState>(() =>
    typeof window === "undefined" ? loadState() : loadState(),
  );

  const setState = useCallback((updater: (s: UserState) => UserState) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo<AppContextValue>(() => {
    return {
      state,
      setState,
      confirmAge: () => setState((s) => ({ ...s, ageConfirmed: true })),
      completeOnboarding: () => setState((s) => ({ ...s, onboardingDone: true })),
      signIn: (email, displayName) =>
        setState((s) => ({ ...s, email, displayName })),
      signOut: () =>
        setState((s) => ({
          ...s,
          email: null,
          displayName: null,
          premium: false,
          premiumPlan: null,
        })),
      activatePremium: (plan) =>
        setState((s) => ({ ...s, premium: true, premiumPlan: plan })),
      recordLabelScan: () => {
        const gate = canLabelScan(state);
        if (!gate.ok) return false;
        setState((s) => ({ ...s, scansThisWeek: s.scansThisWeek + 1 }));
        return true;
      },
      recordMenuScan: () => {
        const gate = canMenuScan(state);
        if (!gate.ok) return false;
        setState((s) => ({ ...s, menuScansUsed: s.menuScansUsed + 1 }));
        return true;
      },
      recordFindQuery: () => {
        const gate = canFindWine(state);
        if (!gate.ok) return false;
        setState((s) => ({ ...s, findQueriesToday: s.findQueriesToday + 1 }));
        return true;
      },
      toggleLike: (wineId) =>
        setState((s) => {
          const has = s.likedWineIds.includes(wineId);
          return {
            ...s,
            likedWineIds: has
              ? s.likedWineIds.filter((id) => id !== wineId)
              : [...s.likedWineIds, wineId],
          };
        }),
      rateWine: (wineId, rating) =>
        setState((s) => ({
          ...s,
          ratings: { ...s.ratings, [wineId]: rating },
        })),
      addNote: (wineId, rating, body) => {
        const note: TastingNote = {
          id: `n-${Date.now()}`,
          wineId,
          rating,
          body,
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({
          ...s,
          notes: [note, ...s.notes],
          ratings: { ...s.ratings, [wineId]: rating },
        }));
      },
      toggleSaved: (wineId) =>
        setState((s) => {
          const has = s.savedWineIds.includes(wineId);
          return {
            ...s,
            savedWineIds: has
              ? s.savedWineIds.filter((id) => id !== wineId)
              : [...s.savedWineIds, wineId],
          };
        }),
      setActiveMenu: (menuId, wineIds) =>
        setState((s) => ({
          ...s,
          activeMenuId: menuId,
          activeMenuWineIds: wineIds,
        })),
      labelScanGate: canLabelScan(state),
      menuScanGate: canMenuScan(state),
      findGate: canFindWine(state),
    };
  }, [state, setState]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
