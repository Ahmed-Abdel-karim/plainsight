import type {
  CityData,
  Neighbourhood,
  PriceScale,
  ScopeAggregates,
} from "@/data";
import { CitySwitcher } from "./city-switcher";
import { Logo } from "../logo";

function formatNumber(value: number): string {
  return value.toLocaleString("en");
}

type SidebarContentProps = {
  citySlug: string;
  country: string;
  frame: string;
  listingCount: number;
  snapshotLabel: string;
  cities: CityData[];
};

/**
 * Analysis panel content shared by the desktop `<aside>` and the mobile Drawer
 * (Rule 5: one component serves both presentations — no `isMobile` prop, no
 * duplicate). Pure presentational; the wrapper owns its chrome. The brand row
 * is hidden when this renders inside the bottom Drawer, matching the design's
 * `.sheet .brand-row { display: none }`.
 */
export function SidebarContent({
  citySlug,
  country,
  frame,
  listingCount,
  snapshotLabel,
  cities,
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
        <CitySwitcher cities={cities} citySlug={citySlug} />

        <div className="flex flex-wrap items-center gap-inline text-muted-foreground type-label">
          <span>{country}</span>
          <span aria-hidden="true">·</span>
          <span
            role="status"
            aria-live="polite"
            className="font-mono text-foreground tabular-nums"
          >
            {formatNumber(listingCount)} listings
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
    </>
  );
}

/**
 * Desktop sidebar: the solid `bg-card` analysis aside in the scene split. Shown
 * at `lg`+ only; below that the same content moves into the mobile Drawer
 * (see `scene-drawer.tsx`).
 */
export function SidebarRegion({
  citySlug,
  country,
  frame,
  listingCount,
  snapshotLabel,
  cities,
}: {
  citySlug: string;
  country: string;
  frame: string;
  currency: string;
  listingCount: number;
  snapshotLabel: string;
  aggregates: ScopeAggregates;
  neighbourhoods: Neighbourhood[];
  priceScale: PriceScale;
  cities: CityData[];
}) {
  return (
    <aside
      aria-label="Market analysis"
      className="@container hidden w-full flex-col gap-section overflow-y-auto border-r border-border bg-card px-section pt-section pb-gutter lg:flex lg:h-screen lg:min-h-0"
    >
      <SidebarContent
        citySlug={citySlug}
        country={country}
        frame={frame}
        listingCount={listingCount}
        snapshotLabel={snapshotLabel}
        cities={cities}
      />
    </aside>
  );
}
