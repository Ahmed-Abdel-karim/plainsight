/**
 * E1-S2 / E1-S3 baseline: the active scope label. Reads the city name and the
 * total listing count for the current scope. Uses a polite live region so that
 * later scope narrowing (neighbourhood selection) announces count changes
 * without re-plumbing.
 */
export function ScopeLabel({
  cityName,
  count,
}: {
  cityName: string;
  count: number;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
    >
      <span className="type-title text-foreground">{cityName}</span>
      <span aria-hidden="true" className="text-muted-foreground">
        ·
      </span>
      <span className="text-muted-foreground tabular-nums type-body">
        {count.toLocaleString("en")} listings
      </span>
    </div>
  );
}
