/**
 * Error state shown when the Browse points tier fails to load — distinguishes a
 * data failure from a legitimately empty result set, so a broken tier never
 * reads as a valid "no listings match".
 */
export function BrowseError() {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-stack rounded-lg border border-border p-gutter"
    >
      <div className="flex flex-col gap-snug">
        <p className="text-foreground type-body">Couldn&apos;t load listings</p>
        <p className="type-caption text-muted-foreground">
          The listings data is unavailable. Try reloading the page.
        </p>
      </div>
    </div>
  );
}
