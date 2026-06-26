"use client";

import { ChevronDownIcon, ReloadIcon } from "@radix-ui/react-icons";

import { usePendingSlug } from "../state";

/**
 * The switcher trigger title. Normally the current city's name; while a city
 * switch is in flight it optimistically shows the *pending* city (so the header
 * matches the click immediately instead of lagging on the old city until the new
 * route resolves) with a spinner alongside. `pendingSlug` is non-null while the
 * navigation actor has a pending path, so it drives both the name and the
 * spinner. The dropdown itself stays enabled — the user can keep switching.
 *
 * `nameBySlug` is passed from the server component (which holds the cities index);
 * an unknown slug falls back to the slug itself (`capitalize` tidies it).
 */
export function CityTitle({
  cityName,
  nameBySlug,
}: {
  cityName: string;
  nameBySlug: Record<string, string>;
}) {
  const pendingSlug = usePendingSlug();
  const title =
    pendingSlug !== null ? (nameBySlug[pendingSlug] ?? pendingSlug) : cityName;

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="m-0 type-title text-foreground capitalize">{title}</h1>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        />
      </div>
      {pendingSlug !== null && (
        <ReloadIcon
          aria-hidden
          className="size-4 animate-spin text-muted-foreground"
        />
      )}
    </div>
  );
}
