import { ChevronRight } from "lucide-react";
import Image from "next/image";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { CityData } from "@/data";
import { cityImages } from "./city-images";
import { CardLink } from "./card-link";

export function CityCard({ city }: { city: CityData }) {
  return (
    <li>
      <CardLink href={`/${city.slug}`} city={city}>
        <Card className="h-full gap-0 border border-border py-0 transition-colors group-hover:bg-muted">
          <div className="relative flex h-30 w-full">
            <Image
              src={cityImages[city.slug]}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              quality={50}
              placeholder="blur"
              priority
            />
          </div>
          <CardContent className="flex flex-1 flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="type-title text-card-foreground">{city.name}</h3>
                <p className="text-muted-foreground type-body">
                  {city.country}
                </p>
              </div>
              <ChevronRight
                className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="inline-flex w-fit rounded-full border border-border px-2 py-1 type-caption text-muted-foreground transition-colors group-hover:border-brand-emphasis group-hover:text-brand-emphasis">
              {city.frame}
            </span>
          </CardContent>
          <CardFooter className="items-baseline gap-2 border-t border-border p-4 type-caption text-muted-foreground">
            <span className="text-card-foreground tabular-nums">
              {city.listings}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {city.snapshotLabel.trim()} snapshot
            </span>
          </CardFooter>
        </Card>
      </CardLink>
    </li>
  );
}
