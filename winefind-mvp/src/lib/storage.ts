const KEY = "vintly-mvp-v1";

export interface TastingNote {
  id: string;
  wineId: string;
  rating: number; // 1-5
  body: string;
  createdAt: string;
}

export interface UserState {
  ageConfirmed: boolean;
  onboardingDone: boolean;
  email: string | null;
  displayName: string | null;
  premium: boolean;
  premiumPlan: "monthly" | "annual" | null;
  likedWineIds: string[];
  ratings: Record<string, number>;
  notes: TastingNote[];
  savedWineIds: string[];
  scansThisWeek: number;
  scanWeekKey: string;
  findQueriesToday: number;
  findDayKey: string;
  menuScansUsed: number;
  activeMenuId: string | null;
  activeMenuWineIds: string[];
}

const FREE_SCANS_PER_WEEK = 3;
const FREE_FIND_PER_DAY = 3;
const FREE_MENU_SCANS = 1;

function weekKey(d = new Date()): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${weekNo}`;
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function defaultState(): UserState {
  return {
    ageConfirmed: false,
    onboardingDone: false,
    email: null,
    displayName: null,
    premium: false,
    premiumPlan: null,
    likedWineIds: [],
    ratings: {},
    notes: [],
    savedWineIds: [],
    scansThisWeek: 0,
    scanWeekKey: weekKey(),
    findQueriesToday: 0,
    findDayKey: dayKey(),
    menuScansUsed: 0,
    activeMenuId: null,
    activeMenuWineIds: [],
  };
}

export function loadState(): UserState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = { ...defaultState(), ...JSON.parse(raw) } as UserState;
    const wk = weekKey();
    if (parsed.scanWeekKey !== wk) {
      parsed.scanWeekKey = wk;
      parsed.scansThisWeek = 0;
    }
    const dk = dayKey();
    if (parsed.findDayKey !== dk) {
      parsed.findDayKey = dk;
      parsed.findQueriesToday = 0;
    }
    return parsed;
  } catch {
    return defaultState();
  }
}

export function saveState(state: UserState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function canLabelScan(state: UserState): { ok: boolean; remaining: number } {
  if (state.premium) return { ok: true, remaining: Infinity };
  const remaining = Math.max(0, FREE_SCANS_PER_WEEK - state.scansThisWeek);
  return { ok: remaining > 0, remaining };
}

export function canMenuScan(state: UserState): { ok: boolean; remaining: number } {
  if (state.premium) return { ok: true, remaining: Infinity };
  const remaining = Math.max(0, FREE_MENU_SCANS - state.menuScansUsed);
  return { ok: remaining > 0, remaining };
}

export function canFindWine(state: UserState): { ok: boolean; remaining: number } {
  if (state.premium) return { ok: true, remaining: Infinity };
  const remaining = Math.max(0, FREE_FIND_PER_DAY - state.findQueriesToday);
  return { ok: remaining > 0, remaining };
}

export { FREE_SCANS_PER_WEEK, FREE_FIND_PER_DAY, FREE_MENU_SCANS };
