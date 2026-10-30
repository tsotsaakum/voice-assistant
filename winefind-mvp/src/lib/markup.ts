export type MarkupTier = "fair" | "steep" | "extreme";

export interface MarkupResult {
  ratio: number;
  tier: MarkupTier;
  label: string;
  savingsHint: string;
}

/** Extreme ≈ 7× retail per Wine Find positioning; steep from ~3×; fair below. */
export function classifyMarkup(menuPrice: number, marketPrice: number): MarkupResult {
  if (marketPrice <= 0) {
    return {
      ratio: 0,
      tier: "fair",
      label: "Unknown",
      savingsHint: "No market price on file.",
    };
  }
  const ratio = menuPrice / marketPrice;
  if (ratio >= 7) {
    return {
      ratio,
      tier: "extreme",
      label: "Extreme markup",
      savingsHint: `About ${ratio.toFixed(1)}× retail — strong candidate to skip or corkage.`,
    };
  }
  if (ratio >= 3) {
    return {
      ratio,
      tier: "steep",
      label: "Steep markup",
      savingsHint: `About ${ratio.toFixed(1)}× retail — look for better value on the list.`,
    };
  }
  return {
    ratio,
    tier: "fair",
    label: "Fair markup",
    savingsHint: `About ${ratio.toFixed(1)}× retail — typical restaurant range.`,
  };
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
