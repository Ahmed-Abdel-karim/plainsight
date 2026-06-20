/**
 * Display formatters for the analysis sidebar. `currency` arrives as an ISO code
 * (e.g. "GBP", "EUR"), so prices are rendered through `Intl.NumberFormat` to get
 * a proper symbol ("£120", "€120") rather than a literal code prefix.
 */

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Split a formatted price into its symbol and amount so the symbol can be styled
 * as a smaller unit (matching the design's `.kpi-unit`).
 */
export function formatPriceParts(
  value: number,
  currency: string,
): { symbol: string; amount: string } {
  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).formatToParts(value);

  const symbol = parts.find((p) => p.type === "currency")?.value ?? "";
  const amount = parts
    .filter((p) => p.type !== "currency" && p.type !== "literal")
    .map((p) => p.value)
    .join("");

  return { symbol, amount };
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString("en", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Share in 0..1 → "42%". */
export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}
