import { DEMO_MENUS, WINES, type DemoMenu, type Wine } from "../data/wines";

export interface LabelScanResult {
  wine: Wine | null;
  confidence: number;
  matchedKeywords: string[];
  rawText: string;
  empty: boolean;
}

export interface MenuScanMatch {
  wine: Wine;
  menuPriceUsd: number;
  confidence: number;
}

export interface MenuScanResult {
  menu: DemoMenu | null;
  matches: MenuScanMatch[];
  unmatchedLines: string[];
  empty: boolean;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Demo OCR: use filename hints, optional pasted text, or a canned sample. */
export function extractTextFromScanInput(input: {
  fileName?: string;
  pastedText?: string;
  useSampleLabel?: boolean;
}): string {
  if (input.pastedText?.trim()) return input.pastedText.trim();
  if (input.useSampleLabel) {
    return "François Crochet Sancerre Les Caillottes 2022 Loire Valley France";
  }
  if (input.fileName) {
    const base = input.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    return base;
  }
  return "";
}

export function matchLabelScan(rawText: string): LabelScanResult {
  const text = normalize(rawText);
  if (!text) {
    return { wine: null, confidence: 0, matchedKeywords: [], rawText, empty: true };
  }

  let best: { wine: Wine; score: number; keywords: string[] } | null = null;

  for (const wine of WINES) {
    const hits = wine.scanKeywords.filter((k) => text.includes(normalize(k)));
    const nameHit = text.includes(normalize(wine.name)) ? 2 : 0;
    const producerHit = text.includes(normalize(wine.producer)) ? 2 : 0;
    const score = hits.length + nameHit + producerHit;
    if (score > 0 && (!best || score > best.score)) {
      best = { wine, score, keywords: hits };
    }
  }

  if (!best) {
    return { wine: null, confidence: 0.15, matchedKeywords: [], rawText, empty: false };
  }

  const confidence = Math.min(0.98, 0.45 + best.score * 0.12);
  return {
    wine: best.wine,
    confidence,
    matchedKeywords: best.keywords,
    rawText,
    empty: false,
  };
}

export function matchMenuScan(rawText: string, menuId?: string): MenuScanResult {
  const text = normalize(rawText);
  if (!text) {
    return { menu: null, matches: [], unmatchedLines: [], empty: true };
  }

  const menu =
    (menuId && DEMO_MENUS.find((m) => m.id === menuId)) ||
    DEMO_MENUS.find((m) => text.includes(normalize(m.restaurant))) ||
    (text.includes("wine list") || text.includes("sancerre") || text.includes("barolo")
      ? DEMO_MENUS[0]
      : null);

  if (menu && (menuId || normalize(menu.ocrText).slice(0, 40) === text.slice(0, 40) || text.length > 40)) {
    // Prefer structured demo menu when OCR resembles a list
    const fromDemo = scoreMenuAgainstCatalog(menu.ocrText.length > text.length ? menu.ocrText : rawText, menu);
    if (fromDemo.matches.length) return { ...fromDemo, empty: false };
  }

  return scoreMenuAgainstCatalog(rawText, menu);
}

function scoreMenuAgainstCatalog(rawText: string, menu: DemoMenu | null): MenuScanResult {
  const lines = rawText
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const matches: MenuScanMatch[] = [];
  const unmatchedLines: string[] = [];
  const seen = new Set<string>();

  if (menu) {
    for (const item of menu.items) {
      const wine = WINES.find((w) => w.id === item.wineId);
      if (!wine || seen.has(wine.id)) continue;
      seen.add(wine.id);
      matches.push({ wine, menuPriceUsd: item.menuPriceUsd, confidence: 0.92 });
    }
    return { menu, matches, unmatchedLines, empty: matches.length === 0 };
  }

  for (const line of lines) {
    const result = matchLabelScan(line);
    if (result.wine && !seen.has(result.wine.id)) {
      seen.add(result.wine.id);
      const priceMatch = line.match(/\$?\s*(\d{2,4})\b/);
      const menuPriceUsd = priceMatch ? Number(priceMatch[1]) : result.wine.marketPriceUsd * 2.5;
      matches.push({
        wine: result.wine,
        menuPriceUsd,
        confidence: result.confidence,
      });
    } else if (line.length > 8 && !/wine list|white|red|sparkling/i.test(line)) {
      unmatchedLines.push(line);
    }
  }

  return { menu: null, matches, unmatchedLines, empty: matches.length === 0 };
}

export function searchWinesManual(query: string): Wine[] {
  const q = normalize(query);
  if (!q) return [];
  return WINES.filter((w) => {
    const hay = normalize(
      [w.name, w.producer, w.region, w.country, ...w.grapes, ...w.scanKeywords].join(" "),
    );
    return q.split(" ").every((token) => hay.includes(token));
  });
}
