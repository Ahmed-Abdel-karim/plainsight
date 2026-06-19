Plainsight — E2E scenarios (Phase C)

> Companion to `docs/testing-strategy.md`. That file holds the _why_ (Principle 3,
> the trophy, the MapGrab/option-A decision); this file is the **executable scope**
> for the E2E layer — the settled scenario set and the seams to build it on. Where
> this and shipped code disagree, the code wins and this note gets fixed.

---

## The shape — real user journeys, not atomic per-concern flows

E2E follows **real user journeys**. The trophy's atomic discipline applies to the
integration tier (already built and green), **not** to the rationed browser layer.
This is Playwright's documented philosophy:

- _Test user-visible behavior_ — drive what the user sees (roles/names), not
  internals.
- **"Isolated" means test-to-test independence, not a short test.** A long journey
  in one `test()` is fully isolated as long as it doesn't depend on a previous one.
- `test.step()` and `expect.soft()` exist precisely to support long, debuggable
  journeys — steps surface in the report/trace viewer and localize failures.

The journey is a **delivery vehicle**: one forward narrative naturally walks through
every browser-only fact (map boot, both lenses' real-pointer-hit wiring, the
`interactiveLayerIds` swap, the hex popup, select→drawer→URL), so we don't need a
separate test per interaction.

### Governing rule (keeps the journey from re-running the integration suite)

At each step **assert the browser-only fact** — the thing the Principle-2
render-boundary mock had to fake — and **pass through** the integration-owned logic
(filter math, sort comparator, panel content; already green in jsdom). This is also
the **drift backstop** Principle 3 calls for: the journey exercises both lenses'
real-pointer-hits-feature wiring in a real browser.

---

## Test 1 — the exploration journey (the README demo path)

One `test()`, built from `test.step()`. Assert only the browser-only fact per step.

1. **Open the city selector → pick a city.** → map **boots in real WebGL**
   (`loading → ready`, MapGrab `waitToMapLoaded()` on `"mainMap"`); scene chrome
   visible.
2. **Change a filter (analyse lens)** — price `slider` / room `button`. → the
   **hex layer actually re-rendered** for the new filter (MapGrab feature query),
   not the aggregation math.
3. **Zoom in.** → **hex re-renders at the new resolution** (MapGrab state) via
   `onZoomEnd → changeMapResolution`, not the `zoomToResolution` calc (unit-owned).
4. **Hover a hex** (real pointer at a feature coordinate). → the **price popup is
   visible with content** (`hex-inspect`) — the real-pointer-hit fact, not price
   formatting.
5. **Switch to the Browse lens** (`radio "Browse"`). → **points visible / hex
   hidden** (MapGrab layer query) and `interactiveLayerIds` swapped (pointer now
   hits points) — the real-browser-only interactivity-mode swap.
6. **Filter to Hotel** (room `button`). → **points on the map narrowed** (MapGrab
   feature count drops); pass through the list re-render.
7. **Sort price low → high** (`combobox "Sort"`). → the **first card's order in the
   real DOM**, lightly; don't re-prove the comparator.
8. **Select a listing via the map** (real pointer click on a dot). → the **drift
   backstop**: feature gains `selected` (MapGrab), the **detail drawer opens**, and
   the **URL gains `?listing=<id>`**.

---

## Test 2 — cold deep-link restore + theme swap

A separate `test()`: a deep-link is a fresh load _into_ a pre-built state, so it
can't be a sub-step of a forward journey (the isolation rule makes it its own test).

1. **Cold deep-link** — fresh `goto` of
   `/london?lens=browse&nbhd=<id>&price=100&price=300&listing=<id>`. → the **map
   flew to the scoped bounds** (MapGrab center/bbox) and the **selected listing is
   reflected** (feature `selected` + drawer) — the _visual_ restore jsdom can't
   prove; the seeding logic itself stays integration-testable.
2. **Theme swap of the basemap in place** — toggle. → the **basemap style swapped**
   (`…/dark` → `…/positron`) with **no reload** and the map still `ready` — via the
   live style URL, not a screenshot.

---

## Implementation seams (verified, ready)

- **Flag-gated `installMapGrab` — the one app-code touch.** A new public flag
  (e.g. `NEXT_PUBLIC_E2E`, set only by the Playwright `webServer` env) so the
  instrumentation is **absent in production** (dead-code-eliminated). Call it in
  `components/scene/map/map-canvas.tsx` `handleLoad` (after `reportMapLoaded` /
  `updateMapTheme`) with the raw instance: `installMapGrab(mapRef.current.getMap(),
"mainMap")`, following the existing `process.env.NODE_ENV !== "production"` gate
  in `components/scene/map/layers/layer.tsx`. Test infra, not a feature.
- **All driven controls already carry accessible roles/names** — no component
  changes needed:
  | Control | Query |
  | --- | --- |
  | City switcher | `getByRole("button", { name: /<city>/i })` |
  | Lens switcher | `getByRole("radio", { name: "Browse" })` (group `"Market lens"`) |
  | Sort | `getByRole("combobox", { name: "Sort" })` |
  | Room type | `getByRole("button", { name: "Hotel" })` (group `"Room type"`) |
  | Price | `getByRole("slider", { name: "Price range" })` |
- **Data**: four-city `data/cities/cities.json` over the `/api/cities/[slug]/[tier]`
  route handlers.
- **New files**: `playwright.config.ts` (Chromium-only; `baseURL`
  `http://localhost:3000`; `webServer` = production build + `next start` with the
  E2E flag; software-WebGL launch flags `--use-gl=angle --use-angle=swiftshader`;
  `trace: "on-first-retry"`); `e2e/exploration.spec.ts`, `e2e/deep-link.spec.ts`,
  `e2e/support/*` (role-query page helpers + a thin MapGrab wrapper). Dev deps:
  `@playwright/test`, `mapgrab`. Scripts: `test:e2e`, `test:e2e:ui`.

---

## CI (to build — no longer blocked on a decision)

GitHub Actions Ubuntu, Chromium-only, software WebGL (no GPU runner, no `xvfb`
pixel path), cached Playwright browser, app served via the config `webServer`.

**Network-flake hardening is a deferred lever, not a blocker** — the basemap
style/tiles load from `tiles.openfreemap.org`; option A asserts state not pixels, so
a loaded style suffices. If CI flake appears, pin the style version and/or self-host
a fixed/offline style JSON (the Principle-3 CI lever).

---

## Verification

- `npm run test:e2e` runs both specs green on Chromium locally (software WebGL).
- Trace viewer shows each `test.step` as a named, debuggable step; a forced failure
  localizes to its step.
- The instrumentation is **gone from a production build** — build without
  `NEXT_PUBLIC_E2E` and confirm no `installMapGrab` / MapGrab symbol in the client
  bundle.
- `npm test` (vitest) + `npm run lint:strict` + `tsc` stay green — no regression
  from the `map-canvas.tsx` flag gate.
