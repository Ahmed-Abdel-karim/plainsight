"use client";

import { ReloadIcon } from "@radix-ui/react-icons";

import { useHexCellsPending, useMapIsSuppressed } from "@/features/scene/state";
import { useLens } from "@/features/scene/shared/use-lens";

export function HexLoadingOverlay() {
  const { isBrowse } = useLens();
  const suppressed = useMapIsSuppressed();
  const hexPending = useHexCellsPending();

  if (isBrowse || suppressed || !hexPending) return null;

  return (
    <div
      role="status"
      aria-label="Loading prices"
      className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center"
    >
      <span className="bg-map-bg/90 text-map-label flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm backdrop-blur-sm type-label">
        <ReloadIcon aria-hidden className="size-3.5 animate-spin" />
        Loading prices…
      </span>
    </div>
  );
}
