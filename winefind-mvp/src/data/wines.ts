export type WineStyle = "red" | "white" | "rosé" | "sparkling" | "orange";

export interface CriticScore {
  source: string;
  score: number; // out of 100
}

export interface Wine {
  id: string;
  name: string;
  producer: string;
  vintage: number;
  region: string;
  country: string;
  grapes: string[];
  style: WineStyle;
  tastingNotes: string;
  aromas: string[];
  flavorTags: string[];
  foodPairings: string[];
  /** Typical retail market price in USD */
  marketPriceUsd: number;
  criticScores: CriticScore[];
  vineyard?: string;
  /** Keywords used by demo OCR / menu match */
  scanKeywords: string[];
  climate?: "cool" | "moderate" | "warm";
}

export interface MenuItem {
  wineId: string;
  menuPriceUsd: number;
}

export interface DemoMenu {
  id: string;
  restaurant: string;
  city: string;
  items: MenuItem[];
  /** Simulated OCR blob for menu scan */
  ocrText: string;
}

export const WINES: Wine[] = [
  {
    id: "w-001",
    name: "Sancerre Les Caillottes",
    producer: "François Crochet",
    vintage: 2022,
    region: "Loire Valley",
    country: "France",
    grapes: ["Sauvignon Blanc"],
    style: "white",
    tastingNotes:
      "Crisp citrus and gooseberry with wet-stone minerality and a saline finish. Classic cool-climate Sancerre.",
    aromas: ["citrus", "gooseberry", "flint", "white flowers"],
    flavorTags: ["crisp", "mineral", "dry", "high-acid"],
    foodPairings: ["oysters", "goat cheese", "seafood", "sushi"],
    marketPriceUsd: 28,
    criticScores: [
      { source: "Wine Spectator", score: 91 },
      { source: "Vinous", score: 90 },
    ],
    vineyard: "Les Caillottes",
    scanKeywords: ["sancerre", "caillottes", "crochet", "francois crochet"],
    climate: "cool",
  },
  {
    id: "w-002",
    name: "Barolo Cannubi",
    producer: "Michele Chiarlo",
    vintage: 2019,
    region: "Piedmont",
    country: "Italy",
    grapes: ["Nebbiolo"],
    style: "red",
    tastingNotes:
      "Rose petal, tar, and cherry with firm tannins and long savory length. Structured Nebbiolo for steak nights.",
    aromas: ["rose", "cherry", "tar", "licorice"],
    flavorTags: ["structured", "savory", "tannic", "complex"],
    foodPairings: ["steak", "truffle pasta", "aged cheese", "roast lamb"],
    marketPriceUsd: 75,
    criticScores: [
      { source: "Robert Parker", score: 94 },
      { source: "Wine Enthusiast", score: 93 },
    ],
    vineyard: "Cannubi",
    scanKeywords: ["barolo", "cannubi", "chiarlo", "michele chiarlo"],
    climate: "moderate",
  },
  {
    id: "w-003",
    name: "Chenin Blanc Bush Vine",
    producer: "Raats Family",
    vintage: 2023,
    region: "Stellenbosch",
    country: "South Africa",
    grapes: ["Chenin Blanc"],
    style: "white",
    tastingNotes:
      "Yellow apple, quince, and honeyed citrus with creamy texture and bright Cape acidity.",
    aromas: ["apple", "quince", "honey", "citrus"],
    flavorTags: ["textured", "fresh", "stone-fruit", "versatile"],
    foodPairings: ["roast chicken", "pork", "mild curry", "soft cheese"],
    marketPriceUsd: 18,
    criticScores: [
      { source: "Platter's", score: 92 },
      { source: "Tim Atkin", score: 91 },
    ],
    scanKeywords: ["raats", "chenin", "bush vine", "stellenbosch"],
    climate: "warm",
  },
  {
    id: "w-004",
    name: "Pinot Noir Willamette",
    producer: "Domaine Drouhin",
    vintage: 2021,
    region: "Willamette Valley",
    country: "USA",
    grapes: ["Pinot Noir"],
    style: "red",
    tastingNotes:
      "Red cherry, forest floor, and silk tannins. Cool-climate elegance that loves salmon and mushrooms.",
    aromas: ["cherry", "earth", "violet", "spice"],
    flavorTags: ["elegant", "silky", "red-fruit", "cool-climate"],
    foodPairings: ["salmon", "mushroom risotto", "duck", "roast chicken"],
    marketPriceUsd: 42,
    criticScores: [
      { source: "James Suckling", score: 93 },
      { source: "Wine Spectator", score: 92 },
    ],
    scanKeywords: ["drouhin", "willamette", "pinot noir", "domaine drouhin"],
    climate: "cool",
  },
  {
    id: "w-005",
    name: "Champagne Brut Réserve",
    producer: "Billecart-Salmon",
    vintage: 0,
    region: "Champagne",
    country: "France",
    grapes: ["Pinot Noir", "Chardonnay", "Pinot Meunier"],
    style: "sparkling",
    tastingNotes:
      "Fine mousse, brioche, lemon zest, and orchard fruit. Celebration bottle with real precision.",
    aromas: ["brioche", "lemon", "apple", "almond"],
    flavorTags: ["fine-bubble", "toasty", "crisp", "elegant"],
    foodPairings: ["oysters", "caviar", "fried chicken", "soft cheese"],
    marketPriceUsd: 55,
    criticScores: [
      { source: "Wine Advocate", score: 92 },
      { source: "Decanter", score: 93 },
    ],
    scanKeywords: ["billecart", "salmon", "brut reserve", "champagne"],
    climate: "cool",
  },
  {
    id: "w-006",
    name: "Malbec Estate",
    producer: "Catena Zapata",
    vintage: 2021,
    region: "Mendoza",
    country: "Argentina",
    grapes: ["Malbec"],
    style: "red",
    tastingNotes:
      "Blackberry, violet, and cocoa with ripe tannins. High-altitude warmth for grilled meats.",
    aromas: ["blackberry", "violet", "cocoa", "plum"],
    flavorTags: ["ripe", "bold", "dark-fruit", "smooth"],
    foodPairings: ["steak", "BBQ", "empanadas", "hard cheese"],
    marketPriceUsd: 24,
    criticScores: [
      { source: "Wine Spectator", score: 90 },
      { source: "James Suckling", score: 91 },
    ],
    scanKeywords: ["catena", "zapata", "malbec", "mendoza"],
    climate: "warm",
  },
  {
    id: "w-007",
    name: "Riesling Kabinett",
    producer: "Donnhoff",
    vintage: 2022,
    region: "Nahe",
    country: "Germany",
    grapes: ["Riesling"],
    style: "white",
    tastingNotes:
      "Lime, slate, and white peach with featherweight sweetness and electric acidity.",
    aromas: ["lime", "slate", "peach", "blossom"],
    flavorTags: ["off-dry", "electric", "mineral", "light"],
    foodPairings: ["spicy Thai", "pork belly", "shellfish", "fruit desserts"],
    marketPriceUsd: 32,
    criticScores: [
      { source: "Vinous", score: 94 },
      { source: "Wine Advocate", score: 93 },
    ],
    scanKeywords: ["donnhoff", "dönnhoff", "riesling", "kabinett", "nahe"],
    climate: "cool",
  },
  {
    id: "w-008",
    name: "Châteauneuf-du-Pape",
    producer: "Clos des Papes",
    vintage: 2020,
    region: "Southern Rhône",
    country: "France",
    grapes: ["Grenache", "Mourvèdre", "Syrah"],
    style: "red",
    tastingNotes:
      "Garrigue, black cherry, and spice with layered warmth. Benchmark Southern Rhône depth.",
    aromas: ["garrigue", "cherry", "pepper", "leather"],
    flavorTags: ["rich", "spicy", "layered", "warm"],
    foodPairings: ["lamb", "stew", "grilled vegetables", "aged cheese"],
    marketPriceUsd: 110,
    criticScores: [
      { source: "Jeb Dunnuck", score: 97 },
      { source: "Wine Spectator", score: 96 },
    ],
    scanKeywords: ["clos des papes", "chateauneuf", "châteauneuf", "rhone"],
    climate: "warm",
  },
  {
    id: "w-009",
    name: "Albariño Rías Baixas",
    producer: "Pazo Señorans",
    vintage: 2023,
    region: "Rías Baixas",
    country: "Spain",
    grapes: ["Albariño"],
    style: "white",
    tastingNotes:
      "Saline pear and citrus with Atlantic freshness — built for seafood and hot evenings.",
    aromas: ["pear", "citrus", "sea spray", "herbs"],
    flavorTags: ["saline", "crisp", "fresh", "dry"],
    foodPairings: ["oysters", "grilled fish", "ceviche", "tapas"],
    marketPriceUsd: 22,
    criticScores: [
      { source: "Wine Enthusiast", score: 91 },
      { source: "Decanter", score: 90 },
    ],
    scanKeywords: ["pazo", "senorans", "señorans", "albarino", "albariño"],
    climate: "cool",
  },
  {
    id: "w-010",
    name: "Cabernet Sauvignon Reserve",
    producer: "Jordan",
    vintage: 2019,
    region: "Stellenbosch",
    country: "South Africa",
    grapes: ["Cabernet Sauvignon"],
    style: "red",
    tastingNotes:
      "Blackcurrant, cedar, and graphite with Cape structure. Confident steakhouse red.",
    aromas: ["cassis", "cedar", "graphite", "tobacco"],
    flavorTags: ["structured", "classic", "dark-fruit", "cellarable"],
    foodPairings: ["steak", "braised short rib", "mushroom pie", "hard cheese"],
    marketPriceUsd: 35,
    criticScores: [
      { source: "Tim Atkin", score: 92 },
      { source: "Platter's", score: 91 },
    ],
    scanKeywords: ["jordan", "cabernet", "stellenbosch", "reserve"],
    climate: "warm",
  },
];

export const DEMO_MENUS: DemoMenu[] = [
  {
    id: "menu-bistro",
    restaurant: "Copper Lantern Bistro",
    city: "Cape Town",
    items: [
      { wineId: "w-001", menuPriceUsd: 68 },
      { wineId: "w-003", menuPriceUsd: 42 },
      { wineId: "w-004", menuPriceUsd: 95 },
      { wineId: "w-005", menuPriceUsd: 160 },
      { wineId: "w-006", menuPriceUsd: 55 },
      { wineId: "w-009", menuPriceUsd: 48 },
      { wineId: "w-010", menuPriceUsd: 90 },
      { wineId: "w-002", menuPriceUsd: 210 },
    ],
    ocrText: `
      COPPER LANTERN BISTRO — WINE LIST
      White
      François Crochet Sancerre Les Caillottes 2022 ........ $68
      Raats Chenin Blanc Bush Vine 2023 ................... $42
      Pazo Señorans Albariño Rías Baixas 2023 ............. $48
      Sparkling
      Billecart-Salmon Brut Réserve ....................... $160
      Red
      Domaine Drouhin Pinot Noir Willamette 2021 .......... $95
      Catena Zapata Malbec Estate 2021 .................... $55
      Jordan Cabernet Sauvignon Reserve 2019 .............. $90
      Michele Chiarlo Barolo Cannubi 2019 ................. $210
    `,
  },
  {
    id: "menu-steak",
    restaurant: "Ironwood Grill",
    city: "Johannesburg",
    items: [
      { wineId: "w-002", menuPriceUsd: 520 },
      { wineId: "w-006", menuPriceUsd: 70 },
      { wineId: "w-008", menuPriceUsd: 385 },
      { wineId: "w-010", menuPriceUsd: 120 },
      { wineId: "w-004", menuPriceUsd: 110 },
    ],
    ocrText: `
      IRONWOOD GRILL WINE LIST
      Michele Chiarlo Barolo Cannubi 2019 — $520
      Catena Zapata Malbec 2021 — $70
      Clos des Papes Châteauneuf-du-Pape 2020 — $385
      Jordan Cabernet Reserve Stellenbosch 2019 — $120
      Domaine Drouhin Willamette Pinot Noir 2021 — $110
    `,
  },
];

export function getWineById(id: string): Wine | undefined {
  return WINES.find((w) => w.id === id);
}

export function averageCriticScore(wine: Wine): number {
  if (!wine.criticScores.length) return 0;
  const sum = wine.criticScores.reduce((a, c) => a + c.score, 0);
  return Math.round((sum / wine.criticScores.length) * 10) / 10;
}

export function displayVintage(wine: Wine): string {
  return wine.vintage === 0 ? "NV" : String(wine.vintage);
}
