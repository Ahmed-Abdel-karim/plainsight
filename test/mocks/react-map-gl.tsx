import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";

import { createFakeMapRef } from "@/test/scene/fake-map";

/**
 * Render-boundary mock for `react-map-gl/maplibre` (Principle 2). jsdom has no WebGL,
 * so we replace *only the library* at its module seam: the declarative `Source`/`Layer`
 * re-emit the data the app handed them as `data-*` attributes (a proxy for "the map
 * rendered it"), and `Map` forwards a fake `MapRef` whose `getMap()` exposes the spied
 * imperative surface. Everything above this seam — the layer components, the
 * machine→props flow, the `useMapRef`/listener wiring — stays real. The real paint is
 * trusted to E2E.
 */

interface MapProps {
  children?: ReactNode;
  onLoad?: () => void;
}

/**
 * Mounts a fake map and fires `onLoad` once the ref is set, driving the real
 * `reportMapLoaded` → `MAP.MOUNTED → READY → RESOLUTION_CHANGED`. The machine stores
 * this same ref, so a test reaches the spies via `map.context.mapRef.getMap()`.
 */
export const Map = forwardRef<unknown, MapProps>(function Map(
  { children, onLoad },
  ref,
) {
  const fake = useRef(createFakeMapRef());
  useImperativeHandle(ref, () => fake.current.ref, []);
  useEffect(() => {
    onLoad?.();
  }, [onLoad]);
  return <div data-testid="map-gl">{children}</div>;
});

interface SourceProps {
  id?: string;
  type?: string;
  data?: { features?: unknown[] };
  promoteId?: string;
  children?: ReactNode;
}

export function Source({ id, type, data, promoteId, children }: SourceProps) {
  return (
    <div
      data-testid={`map-source-${id}`}
      data-source-id={id}
      data-source-type={type}
      data-feature-count={data?.features?.length ?? 0}
      data-promote-id={promoteId}
    >
      {children}
    </div>
  );
}

interface LayerProps {
  id?: string;
  layout?: { visibility?: string };
  filter?: unknown;
}

export function Layer({ id, layout, filter }: LayerProps) {
  return (
    <div
      data-testid={`map-layer-${id}`}
      data-layer-id={id}
      data-layer-visibility={layout?.visibility ?? "visible"}
      data-layer-filter={filter ? JSON.stringify(filter) : undefined}
    />
  );
}

interface PopupProps {
  longitude?: number;
  latitude?: number;
  anchor?: string;
  children?: ReactNode;
}

export function Popup({ longitude, latitude, anchor, children }: PopupProps) {
  return (
    <div
      data-testid="map-popup"
      data-popup-lng={longitude}
      data-popup-lat={latitude}
      data-popup-anchor={anchor}
    >
      {children}
    </div>
  );
}

export function NavigationControl() {
  return null;
}

export function AttributionControl() {
  return null;
}
