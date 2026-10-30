import { describe, expect, it } from "vitest";
import { WINES } from "../data/wines";
import { findWines, parseBudget } from "./findWine";

describe("findWines", () => {
  it("parses under $30 budget", () => {
    expect(parseBudget("crisp white under $30")).toBe(30);
  });

  it("ranks oyster-friendly crisp white under budget", () => {
    const matches = findWines(WINES, {
      text: "crisp white from a cool climate region, pairs well with oysters, under $30",
    });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].wine.style).toBe("white");
    expect(matches[0].wine.marketPriceUsd).toBeLessThanOrEqual(30);
    expect(matches[0].wine.foodPairings).toContain("oysters");
  });

  it("constrains to menu wine ids", () => {
    const matches = findWines(WINES, {
      text: "red steak",
      wineIds: ["w-006"],
    });
    expect(matches.every((m) => m.wine.id === "w-006")).toBe(true);
  });
});
