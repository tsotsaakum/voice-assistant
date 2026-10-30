import { beforeEach, describe, expect, it } from "vitest";
import {
  canFindWine,
  canLabelScan,
  canMenuScan,
  defaultState,
  loadState,
  saveState,
} from "./storage";

describe("freemium gates", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("allows 3 free label scans then blocks", () => {
    const s = defaultState();
    s.scansThisWeek = 3;
    expect(canLabelScan(s).ok).toBe(false);
    s.premium = true;
    expect(canLabelScan(s).ok).toBe(true);
  });

  it("limits free menu scans to 1", () => {
    const s = defaultState();
    s.menuScansUsed = 1;
    expect(canMenuScan(s).ok).toBe(false);
  });

  it("limits find queries per day", () => {
    const s = defaultState();
    s.findQueriesToday = 3;
    expect(canFindWine(s).ok).toBe(false);
  });

  it("persists and reloads state", () => {
    const s = defaultState();
    s.ageConfirmed = true;
    s.email = "a@b.com";
    saveState(s);
    expect(loadState().email).toBe("a@b.com");
  });
});
