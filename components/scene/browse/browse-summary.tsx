/**
 * Live "N of total" result count above the Browse list. The `aria-live` region
 * announces filter changes to screen readers. `shown` is the filtered+scoped
 * set; `total` is the same scope before the price/room filter.
 */
export function BrowseSummary({
  shown,
  total,
}: {
  shown: number;
  total: number;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="type-caption text-muted-foreground tabular-nums"
    >
      <span className="font-mono text-foreground">
        {shown.toLocaleString("en")}
      </span>{" "}
      of {total.toLocaleString("en")} listings
    </p>
  );
}
