import { describe, expect, it } from "vitest";
import { DEMO_MENUS } from "../data/wines";
import {
  extractTextFromScanInput,
  matchLabelScan,
  matchMenuScan,
  searchWinesManual,
} from "./scan";

describe("label scan", () => {
  it("returns empty for blank OCR", () => {
    const r = matchLabelScan("");
    expect(r.empty).toBe(true);
    expect(r.wine).toBeNull();
  });

  it("matches sample Sancerre text", () => {
    const raw = extractTextFromScanInput({ useSampleLabel: true });
    const r = matchLabelScan(raw);
    expect(r.wine?.id).toBe("w-001");
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("falls back when no keywords match", () => {
    const r = matchLabelScan("totally unknown bottle xyz");
    expect(r.empty).toBe(false);
    expect(r.wine).toBeNull();
  });

  it("manual search finds Raats", () => {
    const hits = searchWinesManual("raats chenin");
    expect(hits.some((w) => w.id === "w-003")).toBe(true);
  });
});

describe("menu scan", () => {
  it("handles empty menu OCR", () => {
    const r = matchMenuScan("");
    expect(r.empty).toBe(true);
  });

  it("matches Copper Lantern demo list", () => {
    const menu = DEMO_MENUS[0];
    const r = matchMenuScan(menu.ocrText, menu.id);
    expect(r.matches.length).toBe(menu.items.length);
    expect(r.menu?.restaurant).toBe("Copper Lantern Bistro");
  });
});
