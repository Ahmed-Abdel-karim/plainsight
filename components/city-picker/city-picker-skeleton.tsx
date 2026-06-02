import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Suspense fallback for {@link CityPicker}. Mirrors {@link CityPickerView}'s grid
 * and {@link CityCard}'s shape so the layout doesn't shift when data resolves.
 */
export function CityPickerSkeleton() {
  return (
    <div aria-hidden="true" className="w-full">
      <div className="mb-4 flex justify-center">
        <Skeleton className="h-4 w-28" />
      </div>
      <ul className="mx-auto grid max-w-xl list-none gap-4 p-0 sm:max-w-3xl sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <Card className="h-full gap-0 border border-border py-0">
              <Skeleton className="h-30 w-full rounded-b-none" />
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="mt-0.5 size-4 shrink-0" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </CardContent>
              <CardFooter className="gap-2 border-t border-border p-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
