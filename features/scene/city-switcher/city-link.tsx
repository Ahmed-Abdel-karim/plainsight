"use client";

import Link from "next/link";

import { useStartNav } from "../state";

type CityLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  slug: string;
  isActive: boolean;
};

/**
 * City links report navigation intent before `<Link>` commits the route, giving
 * the scene runtime a chance to enter the switching window before the new city
 * page mounts. Mirrors the lens switcher split: the interactive hook lives in
 * this thin client component, while the server `CitySwitcher` (which self-fetches
 * the server-only cities index) supplies the presentational shell.
 *
 * Rendered as the `asChild` target of a Radix `DropdownMenuItem`, so it spreads
 * the injected props/ref (menu-close handler, roving focus, `data-*`) onto the
 * anchor and *composes* its own click after Radix's. Re-selecting the active
 * city is a no-op signal — there's no previous city to suppress (matches the
 * `NAV.INTENT` contract).
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
