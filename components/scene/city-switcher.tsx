import Link from "next/link";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CityData } from "@/data";

export function CitySwitcher({
  cities,
  citySlug,
}: {
  cities: CityData[];
  citySlug: string;
}) {
  const currentCity = cities.find(({ slug }) => slug === citySlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group -ml-inline justify-start gap-inline"
        >
          <h1 className="m-0 type-title text-foreground">
            {currentCity?.name ?? citySlug}
          </h1>
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
              <Link
                href={`/${slug}`}
                aria-current={isActive ? "page" : undefined}
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
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
