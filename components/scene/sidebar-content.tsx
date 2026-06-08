import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { CityMeta, Scope } from "@/data";
import { AnalysisCardsSkeleton } from "./analysis/analysis-cards-skeleton";
import { FilterPanel } from "./analysis/filter-panel/filter-panel";
import { SidebarAnalysis } from "./analysis/sidebar-analysis";
import { SidebarFoot } from "./analysis/sidebar-foot";
import { SidebarBrowse } from "./browse/sidebar-browse";
import { CitySwitcher } from "./city-switcher";
import { LensActivity } from "./lens-activity";
import { ListingCount } from "./listing-count";
import { Logo } from "../logo";

type SidebarContentProps = {
  cityMeta: CityMeta;
  scope: Scope;
};

/**
 * Analysis panel content shared by the desktop `<aside>` and the mobile Drawer
 * (Rule 5: one component serves both presentations — no `isMobile` prop, no
 * duplicate). The brand row is hidden inside the bottom Drawer, matching the
 * design's `.sheet .brand-row { display: none }`.
 *
 * The lens surface is the shared `FilterPanel` + footer (rendered once, visible
 * in both tabs) wrapped around a `LensActivity` toggle. The stable, meta-derived
 * scalars (`currency`, `bounds`) are threaded in from the page — like the map's
 * framing primitives — so the panel renders immediately; the scope-dependent
 * pieces (the city switcher's index, the header listing count, the analysis
 * aggregates) each still stream behind their own Suspense boundary.
 */
export function SidebarContent({
  scope,
  cityMeta: { slug: citySlug, country, frame, snapshotLabel },
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
        <CitySwitcher citySlug={citySlug} />
        <div className="flex flex-wrap items-center gap-inline text-muted-foreground type-label">
          <span>{country}</span>
          <span aria-hidden="true">·</span>
          <span
            role="status"
            aria-live="polite"
            className="font-mono text-foreground tabular-nums"
          >
            <ListingCount
              citySlug={citySlug}
              scope={scope}
              fallback={
                <Skeleton className="inline-block h-4 w-20 align-middle" />
              }
            />
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
      <div className="flex min-h-0 flex-1 flex-col gap-stack">
        <FilterPanel />

        <Suspense fallback={<AnalysisCardsSkeleton />}>
          <LensActivity
            analysis={
              <div className="flex min-h-0 flex-1 flex-col gap-stack overflow-y-auto">
                <SidebarAnalysis citySlug={citySlug} scope={scope} />
              </div>
            }
            browse={<SidebarBrowse key={citySlug} />}
          />
        </Suspense>
        <SidebarFoot />
      </div>
    </>
  );
}
