import { Skeleton } from "@/components/ui/skeleton";

/**
 * E1-S2: city-scoped map region shell. The interactive priced-pin map arrives
 * in a later epic (E4/E5); for now this is a non-interactive placeholder so the
 * scene always presents a map region against city scope (never blank).
 */
export function MapRegion() {
  return (
    <section
      aria-label="Map"
      className="relative min-h-80 flex-1 overflow-hidden rounded-lg border border-border"
    >
      <Skeleton className="absolute inset-0 rounded-none" />
      <p className="absolute inset-0 flex items-center justify-center text-muted-foreground type-label">
        Map view
      </p>
    </section>
  );
}
