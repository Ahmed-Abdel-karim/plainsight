"use client";

import Link from "next/link";

import { useStartNav } from "../state";

type CityLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  slug: string;
  isActive: boolean;
};

/**
 * Client wrapper around a per-city `<Link>`. On click it fires `NAV.START` into
 * the scene root so `map` + `ui` enter their suppressed/navigating window *before*
 * the new route streams in. Mirrors the lens-tabs split: the interactive hook
 * lives in this thin client component, while the server `CitySwitcher` (which
 * self-fetches the server-only cities index) supplies the presentational shell.
 *
 * Rendered as the `asChild` target of a Radix `DropdownMenuItem`, so it spreads
 * the injected props/ref (menu-close handler, roving focus, `data-*`) onto the
 * anchor and *composes* its own click after Radix's. Re-selecting the active
 * city is a no-op signal — there's no previous city to suppress (matches the
 * `NAV.START` contract).
 */
export function CityLink({ slug, isActive, onClick, ...rest }: CityLinkProps) {
  const startNav = useStartNav();
  return (
    <Link
      {...rest}
      href={`/${slug}`}
      aria-current={isActive ? "page" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!isActive) startNav(slug);
      }}
    />
  );
}
