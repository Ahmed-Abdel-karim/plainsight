"use client";

import { useMemo } from "react";
import { Layer } from "react-map-gl/maplibre";
import type { FilterSpecification, LayerSpecification } from "maplibre-gl";
import { useTheme } from "next-themes";

import type { Theme } from "@/components/theme/theme-provider";

import type { LayerListeners } from "../types";
import type { LayerId } from "../types";
import { isLayerId } from "../types";
import { useLayerListeners } from "../hooks/use-layer-listeners";

/**
 * Discriminated union over every event type in `LayerListeners`.
 * Pass an array of these to `MapLayer` instead of a keyed object.
 */
export type LayerListener = {
  [K in keyof LayerListeners]-?: {
    type: K;
    listener: NonNullable<LayerListeners[K]>;
  };
}[keyof LayerListeners];

/** Style factory signature accepted by `MapLayer`. */
export type GetLayerStyles = (
  theme: Theme,
  visible?: boolean,
) => LayerSpecification;

interface MapLayerProps {
  getLayerStyles: GetLayerStyles;
  visible?: boolean;
  listeners?: LayerListener[];
  /** Data-driven filter expression forwarded to `<Layer>`. */
  filter?: FilterSpecification;
  /** Insert this layer before the given layer id (z-ordering). */
  beforeId?: string;
}

/**
 * Thin wrapper around react-map-gl's `<Layer>` that handles theme resolution
 * and listener registration so domain layer components don't repeat that boilerplate.
 *
 * - `getLayerStyles(theme, visible?)` is called internally with the resolved theme;
 *   closures that need extra params (e.g. price breaks) should be stabilised with
 *   `useCallback` at the call site to prevent spurious style recomputes.
 * - `listeners` is a `{ type, listener }[]` array; the hook's ref optimisation
 *   ensures only a change in the *set* of event types causes a reattach.
 * - `layerSpec.id` must be a registered `LayerId` — a dev-mode error is thrown
 *   immediately if not, so misconfigured style functions are caught early.
 */
export function MapLayer({
  getLayerStyles,
  visible = true,
  listeners = [],
  ...rest
}: MapLayerProps) {
  const { resolvedTheme } = useTheme();
  const theme = (resolvedTheme ?? "light") as Theme;

  const layerSpec = useMemo(
    () => getLayerStyles(theme, visible),
    [getLayerStyles, theme, visible],
  );

  if (process.env.NODE_ENV !== "production" && !isLayerId(layerSpec.id)) {
    throw new Error(
      `MapLayer: "${layerSpec.id}" is not a registered LayerId. Add it to types.ts and constants.ts.`,
    );
  }

  const listenersObj = Object.fromEntries(
    listeners.map(({ type, listener }) => [type, listener]),
  ) as LayerListeners;

  useLayerListeners(layerSpec.id as LayerId, listenersObj, visible);

  return <Layer {...layerSpec} {...rest} />;
}
