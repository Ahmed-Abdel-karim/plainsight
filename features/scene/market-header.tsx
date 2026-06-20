export function MarketHeader({
  cityName,
  listingCount,
  snapshotLabel,
}: {
  cityName: string;
  listingCount: number;
  snapshotLabel: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="type-title text-foreground">{cityName}</h1>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-muted-foreground type-body">
        <span role="status" aria-live="polite" className="tabular-nums">
          {listingCount.toLocaleString("en")} listings
        </span>
        <span aria-hidden="true">·</span>
        <span>Data: {snapshotLabel.trim()} snapshot</span>
      </div>
    </header>
  );
}
