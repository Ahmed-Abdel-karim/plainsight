import { Button } from "@/components/ui/button";

/**
 * Empty state shown when the active scope + filters match no listings: a
 * summary of what is filtering the set to zero, and a reset affordance that
 * clears the filters *and* widens the neighbourhood scope back to city-wide.
 */
export function BrowseEmpty({
  summary,
  onReset,
}: {
  summary: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-stack rounded-lg border border-border p-gutter">
      <div className="flex flex-col gap-snug">
        <p className="text-foreground type-body">
          No listings match the current filters.
        </p>
        <p className="type-caption text-muted-foreground">{summary}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onReset}>
        Show all listings
      </Button>
    </div>
  );
}
