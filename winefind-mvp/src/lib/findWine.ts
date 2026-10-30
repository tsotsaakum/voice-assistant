import { averageCriticScore, type Wine } from "../data/wines";

export interface FindWineQuery {
  text: string;
  /** Limit candidates to these wine IDs (e.g. scanned menu). */
  wineIds?: string[];
  maxBudgetUsd?: number;
}

export interface FindWineMatch {
  wine: Wine;
  score: number;
  reasons: string[];
}

const STYLE_WORDS: Record<string, Wine["style"][]> = {
  white: ["white"],
  red: ["red"],
  rose: ["rosé"],
  rosé: ["rosé"],
  sparkling: ["sparkling"],
  champagne: ["sparkling"],
  orange: ["orange"],
};

export function parseBudget(text: string): number | undefined {
  const under = text.match(/under\s*\$?\s*(\d+)/i);
  if (under) return Number(under[1]);
  const max = text.match(/(?:max|below|less than)\s*\$?\s*(\d+)/i);
  if (max) return Number(max[1]);
  const dollars = text.match(/\$(\d+)/);
  if (dollars) return Number(dollars[1]);
  return undefined;
}

export function findWines(candidates: Wine[], query: FindWineQuery): FindWineMatch[] {
  const text = query.text.toLowerCase();
  const budget = query.maxBudgetUsd ?? parseBudget(text);
  let pool = candidates;
  if (query.wineIds?.length) {
    const set = new Set(query.wineIds);
    pool = pool.filter((w) => set.has(w.id));
  }

  const ranked: FindWineMatch[] = [];

  for (const wine of pool) {
    let score = 0;
    const reasons: string[] = [];

    for (const [word, styles] of Object.entries(STYLE_WORDS)) {
      if (text.includes(word) && styles.includes(wine.style)) {
        score += 4;
        reasons.push(`Matches ${wine.style} style`);
        break;
      }
    }

    if (text.includes("cool climate") || text.includes("cool-climate")) {
      if (wine.climate === "cool") {
        score += 3;
        reasons.push("Cool-climate profile");
      }
    }

    for (const pairing of wine.foodPairings) {
      if (text.includes(pairing.toLowerCase())) {
        score += 5;
        reasons.push(`Pairs with ${pairing}`);
      }
    }

    for (const tag of wine.flavorTags) {
      if (text.includes(tag.replace("-", " ")) || text.includes(tag)) {
        score += 2;
        reasons.push(`Flavor: ${tag}`);
      }
    }

    for (const aroma of wine.aromas) {
      if (text.includes(aroma)) {
        score += 1;
        reasons.push(`Aroma: ${aroma}`);
      }
    }

    for (const grape of wine.grapes) {
      if (text.includes(grape.toLowerCase())) {
        score += 3;
        reasons.push(`Grape: ${grape}`);
      }
    }

    if (text.includes(wine.region.toLowerCase()) || text.includes(wine.country.toLowerCase())) {
      score += 2;
      reasons.push(`Region: ${wine.region}`);
    }

    if (budget !== undefined) {
      if (wine.marketPriceUsd <= budget) {
        score += 3;
        reasons.push(`Within $${budget}`);
      } else {
        score -= 4;
        reasons.push(`Over $${budget} market`);
      }
    } else if (text.includes("value") || text.includes("cheap") || text.includes("budget")) {
      score += Math.max(0, 3 - wine.marketPriceUsd / 40);
      reasons.push("Value-leaning");
    }

    // Soft quality prior
    score += averageCriticScore(wine) / 50;

    if (score > 0 || !text.trim()) {
      if (!text.trim()) {
        ranked.push({
          wine,
          score: averageCriticScore(wine),
          reasons: ["Top-rated fallback"],
        });
      } else if (score > 0) {
        ranked.push({ wine, score, reasons: [...new Set(reasons)].slice(0, 4) });
      }
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
