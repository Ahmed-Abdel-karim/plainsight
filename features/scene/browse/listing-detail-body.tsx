import type { BrowsePointProperties } from "@/data/contract";

/**
 * The detail drawer's metadata body. Renders host (+ multi-host indicator),
 * reviews/month, review count, minimum nights, and the snapshot provenance. It
 * intentionally does not render availability because that field is not in the
 * dataset.
 */
export function ListingDetailBody({
  listing,
  snapshotLabel,
}: {
  listing: BrowsePointProperties;
  snapshotLabel: string;
}) {
  const multiHost = listing.hostListingsCount >= 2;

  return (
    <div className="flex flex-col gap-stack">
      <dl className="flex flex-col gap-snug">
        <Row label="Host">
          <span className="flex items-center gap-snug">
            <span className="text-foreground">{listing.hostName ?? "—"}</span>
            {multiHost && (
              <span
                className="rounded-sm bg-muted px-1 font-mono text-[10px] text-muted-foreground"
                aria-label="Host has two or more listings"
              >
                2+
              </span>
            )}
          </span>
        </Row>
        <Row label="Reviews / month">
          <span className="font-mono text-foreground tabular-nums">
            {listing.reviewsPerMonth === null
              ? "—"
              : listing.reviewsPerMonth.toFixed(1)}
          </span>
        </Row>
        <Row label="Review count">
          <span className="font-mono text-foreground tabular-nums">
            {listing.numberOfReviews.toLocaleString("en")}
          </span>
        </Row>
        <Row label="Minimum nights">
          <span className="font-mono text-foreground tabular-nums">
            {listing.minNights.toLocaleString("en")}
          </span>
        </Row>
      </dl>

      <p className="type-caption-mono text-muted-foreground">
        Listing #{listing.id} · Inside Airbnb · {snapshotLabel} snapshot
      </p>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-stack">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="type-caption">{children}</dd>
    </div>
  );
}
