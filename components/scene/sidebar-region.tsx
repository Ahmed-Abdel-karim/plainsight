import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * E1-S2: city-scoped sidebar region shell. Hosts the scope label and leaves
 * placeholder slots for the analytics (KPIs, price histogram, room-type mix,
 * host concentration) that arrive in later epics (E5/E7/E8).
 */
export function SidebarRegion({ children }: { children?: ReactNode }) {
  return (
    <aside
      aria-label="Market analysis"
      className="flex w-full shrink-0 flex-col gap-4 lg:max-w-sm"
    >
      {children}
      <div className="flex flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </aside>
  );
}
