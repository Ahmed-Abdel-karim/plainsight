"use client";

import Link from "next/link";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CityData } from "@/data/types";

interface CardLinkProps {
  href: string;
  children: ReactNode;
  city: CityData;
}

function activateOnSpace(event: KeyboardEvent<HTMLAnchorElement>) {
  if (event.key !== " ") return;
  event.preventDefault();
  event.currentTarget.click();
}

function cityAriaLabel(city: CityData) {
  return `${city.name}, ${city.country}. ${city.frame}. ${city.listings}. ${city.snapshotLabel.trim()} snapshot.`;
}

export function CardLink({ href, children, city }: CardLinkProps) {
  return (
    <Link
      href={href}
      aria-label={cityAriaLabel(city)}
      onKeyDown={activateOnSpace}
      className={cn(
        "group block rounded-lg transition-transform outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-emphasis focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "motion-safe:hover:-translate-y-0.5",
      )}
    >
      {children}
    </Link>
  );
}
