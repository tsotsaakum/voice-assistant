import { getWineById, WINES, type Wine } from "../data/wines";
import type { UserState } from "./storage";

export interface TasteProfile {
  topAromas: { tag: string; weight: number }[];
  topFlavors: { tag: string; weight: number }[];
  preferredStyles: { style: string; weight: number }[];
  preferredRegions: { region: string; weight: number }[];
  recommendations: Wine[];
}

function bump(map: Map<string, number>, key: string, n: number) {
  map.set(key, (map.get(key) ?? 0) + n);
}

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag, weight]) => ({ tag, weight }));
}

export function buildTasteProfile(state: UserState): TasteProfile {
  const aromas = new Map<string, number>();
  const flavors = new Map<string, number>();
  const styles = new Map<string, number>();
  const regions = new Map<string, number>();
  const liked = new Set(state.likedWineIds);

  for (const [wineId, rating] of Object.entries(state.ratings)) {
    const wine = getWineById(wineId);
    if (!wine) continue;
    const w = rating + (liked.has(wineId) ? 1 : 0);
    wine.aromas.forEach((a) => bump(aromas, a, w));
    wine.flavorTags.forEach((f) => bump(flavors, f, w));
    bump(styles, wine.style, w);
    bump(regions, wine.region, w);
  }

  for (const id of state.likedWineIds) {
    const wine = getWineById(id);
    if (!wine || state.ratings[id]) continue;
    wine.aromas.forEach((a) => bump(aromas, a, 2));
    wine.flavorTags.forEach((f) => bump(flavors, f, 2));
    bump(styles, wine.style, 2);
    bump(regions, wine.region, 2);
  }

  const topAromas = topN(aromas, 5);
  const topFlavors = topN(flavors, 5);
  const preferredStyles = topN(styles, 3).map((x) => ({ style: x.tag, weight: x.weight }));
  const preferredRegions = topN(regions, 3).map((x) => ({ region: x.tag, weight: x.weight }));

  const aromaSet = new Set(topAromas.map((a) => a.tag));
  const flavorSet = new Set(topFlavors.map((f) => f.tag));
  const styleSet = new Set(preferredStyles.map((s) => s.style));

  const recommendations = WINES.filter((w) => !liked.has(w.id) && !state.ratings[w.id])
    .map((w) => {
      let score = 0;
      w.aromas.forEach((a) => {
        if (aromaSet.has(a)) score += 2;
      });
      w.flavorTags.forEach((f) => {
        if (flavorSet.has(f)) score += 2;
      });
      if (styleSet.has(w.style)) score += 3;
      return { w, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.w);

  return { topAromas, topFlavors, preferredStyles, preferredRegions, recommendations };
}
