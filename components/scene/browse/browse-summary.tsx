/**
 * Live "N of total" result count above the Browse list (FR-003). The count is an
 * `aria-live` region so a filter change announces the new matching set to screen
 * readers (CR-003). `shown` is the filtered+scoped set; `total` is the same scope
 * before the price/room filter.
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
