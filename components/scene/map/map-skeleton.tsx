import { Skeleton } from "@/components/ui/skeleton";

export default function MapSkeleton() {
  return (
    <Skeleton className="text-map-label bg-map-bg absolute inset-0 flex items-center justify-center rounded-none type-label">
      Loading map
    </Skeleton>
  );
}
