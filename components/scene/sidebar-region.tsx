import { Skeleton } from "@/components/ui/skeleton";

/**
 * City-scoped sidebar region shell for analytics that arrive in later epics
 * (KPIs, price histogram, room-type mix, host concentration).
 */
export function SidebarRegion() {
  return (
    <aside
      aria-label="Market analysis"
      className="flex w-full shrink-0 flex-col gap-4 lg:max-w-sm"
    >
      <div className="flex flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </aside>
  );
}
