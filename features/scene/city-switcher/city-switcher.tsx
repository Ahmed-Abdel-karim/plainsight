import { CheckIcon, ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCitiesData, type CityData } from "@/data";
import { AsyncBoundary } from "@/components/utils/async-boundary";
import { CityLink } from "./city-link";
import { CityTitle } from "./city-title";

/**
 * Self-fetching city switcher. The full `cities` index is needed only to fill
 * the dropdown (closed by default), so it streams behind a Suspense boundary —
 * the trigger title shows instantly from the fallback (derived from `citySlug`,
 * already on hand), so there's no layout shift while the index loads.
 *
 * Stays a server component (the index comes from the server-only `@/data`
 * barrel); the only interactive bit — firing `NAV.START` on click — is isolated
 * in the `CityLink` client wrapper.
 */
export function CitySwitcher({ citySlug }: { citySlug: string }) {
  return (
    <AsyncBoundary
      data={getCitiesData}
      Component={({ data: cities }) => (
        <CitySwitcherDropdown
          cities={cities}
          cityName={
            cities.find(({ slug }) => slug === citySlug)?.name ?? citySlug
          }
          citySlug={citySlug}
        />
      )}
      fallback={
        <CitySwitcherDropdown
          cities={[]}
          cityName={citySlug}
          citySlug={citySlug}
        />
      }
    />
  );
}

/** Presentational dropdown of cities with the active one highlighted. */
function CitySwitcherDropdown({
  cities,
  cityName,
  citySlug,
}: {
  cities: CityData[];
  cityName: string;
  citySlug: string;
}) {
  const nameBySlug = Object.fromEntries(
    cities.map(({ slug, name }) => [slug, name]),
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group -ml-inline justify-start gap-inline"
        >
          <CityTitle cityName={cityName} nameBySlug={nameBySlug} />
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {cities.map(({ slug, name, listings }) => {
          const isActive = slug === citySlug;
          return (
            <DropdownMenuItem key={slug} asChild>
              <CityLink
                slug={slug}
                isActive={isActive}
                className="justify-between"
              >
                <span className="flex min-w-0 items-center gap-inline">
                  <CheckIcon
                    aria-hidden="true"
                    className={cn(
                      "size-3.5 text-brand-emphasis",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{name}</span>
                </span>
                <span className="type-caption-mono text-muted-foreground">
                  {listings.replace(" listings", "")}
                </span>
              </CityLink>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
