import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { Scope } from "@/data";
import {
  SidebarAnalysis,
  SidebarAnalysisFallback,
} from "./analysis/sidebar-analysis";
import { CitySwitcher, CitySwitcherFallback } from "./city-switcher";
import { ListingCount } from "./listing-count";
import { Logo } from "../logo";

type SidebarContentProps = {
  citySlug: string;
  cityName: string;
  country: string;
  frame: string;
  currency: string;
  snapshotLabel: string;
  scope: Scope;
};

/**
 * Analysis panel content shared by the desktop `<aside>` and the mobile Drawer
 * (Rule 5: one component serves both presentations — no `isMobile` prop, no
 * duplicate). The brand row is hidden inside the bottom Drawer, matching the
 * design's `.sheet .brand-row { display: none }`.
 *
 * Each data region fetches its own tier behind a Suspense boundary — the city
 * switcher's index, the header listing count, and the analysis surface stream
 * independently, so none waits on the others (or on the map's boundaries).
 */
export function SidebarContent({
  citySlug,
  cityName,
  country,
  frame,
  currency,
  snapshotLabel,
  scope,
}: SidebarContentProps) {
  const snapshot = snapshotLabel.trim();

  return (
    <>
      <div className="flex items-center gap-inline border-b border-border pb-gutter group-data-[vaul-drawer-direction=bottom]/drawer-content:hidden">
        <Logo />
        <span className="ml-auto type-caption-mono text-muted-foreground">
          v1 · explorer
        </span>
      </div>

      <header className="flex flex-col gap-inline">
        <Suspense fallback={<CitySwitcherFallback cityName={cityName} />}>
          <CitySwitcher citySlug={citySlug} />
        </Suspense>

        <div className="flex flex-wrap items-center gap-inline text-muted-foreground type-label">
          <span>{country}</span>
          <span aria-hidden="true">·</span>
          <span
            role="status"
            aria-live="polite"
            className="font-mono text-foreground tabular-nums"
          >
            <Suspense
              fallback={
                <Skeleton className="inline-block h-4 w-20 align-middle" />
              }
            >
              <ListingCount citySlug={citySlug} scope={scope} />
            </Suspense>
          </span>
        </div>
        <p className="max-w-sm type-caption text-muted-foreground">{frame}</p>
        <div
          className="flex items-center gap-snug type-caption-mono text-muted-foreground"
          aria-label={`Data snapshot, ${snapshot}`}
        >
          <span
            className="size-snug rounded-full bg-muted-foreground"
            aria-hidden="true"
          />
          Data: {snapshot}
        </div>
      </header>

      <Suspense fallback={<SidebarAnalysisFallback />}>
        <SidebarAnalysis
          citySlug={citySlug}
          scope={scope}
          currency={currency}
        />
      </Suspense>
    </>
  );
}
