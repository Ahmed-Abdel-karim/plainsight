import { Button } from "@/components/ui/button";

/**
 * Empty state shown when the active scope + filters match no listings (FR-012):
 * a summary of what is filtering the set to zero, and a reset affordance. No list
 * rows, no dots, no drawer.
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
        Reset filters
      </Button>
    </div>
  );
}
