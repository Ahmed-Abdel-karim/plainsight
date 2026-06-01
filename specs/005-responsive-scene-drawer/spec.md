# Feature Specification: Responsive Scene Drawer (mobile sidebar)

**Feature Branch**: `004-basemap-theme` (built alongside; not separately branched)

**Created**: 2026-06-01

**Status**: Implemented — **retro-spec** (documents work already shipped, so it
stops being undocumented scope drift; written after the fact for traceability)

**Input**: Follow-up request during the basemap work — "apply the mobile
responsive design as mentioned in `/design` using the Drawer." Captures
`rules/react-components.md` **Rule 5** (below ~1024px the sidebar becomes a
bottom-sheet drawer; the _same_ filter/content component serves desktop and
mobile — no `isMobile` prop, no duplicate component).

## User Scenarios & Testing

### User Story 1 — Analysis panel on a small screen (Priority: P1)

On a phone-width viewport the desktop sidebar would crowd out the map. Instead
the map fills the viewport and the analysis panel is reachable from a floating
bar; tapping it slides up a bottom sheet with the same content the desktop
sidebar shows. The visitor can read the market snapshot and dismiss the sheet to
get back to the map.

**Independent Test**: Load `/{city}` below `lg` (~390px). The desktop aside is
hidden, the map fills the area, a floating "city · N listings" bar sits over the
map, and activating it opens a bottom Drawer containing the analysis content;
the Drawer dismisses via grip drag, scrim tap, or Esc.

## Functional Requirements

- **FR-001**: Below the `lg` breakpoint the desktop `<aside>` MUST be hidden and
  the map MUST fill the viewport; at `lg`+ the desktop split (sidebar + map) is
  unchanged.
- **FR-002**: A floating trigger over the map (using the `.map-chrome`
  scrim/blur treatment, Rule 9) MUST show the city name + listing count and open
  the analysis Drawer. Touch target ≥ 44px (Rule 4 mobile exception).
- **FR-003**: The Drawer MUST be a bottom sheet built on the shadcn `Drawer`
  (vaul) — grip handle, scrim, drag-to-dismiss, focus trap, and Esc-to-close —
  on a solid surface (not translucent; translucency is for over-map chrome only).
- **FR-004**: The Drawer MUST render the **same** `SidebarContent` component the
  desktop aside renders (Rule 5: one component, two presentations; no `isMobile`
  prop, no duplicate implementation).
- **FR-005**: The brand/logo row MUST be hidden when the content renders inside
  the Drawer (matches the prototype's `.sheet .brand-row { display:none }`),
  driven by ancestor context (`group-data-[vaul-drawer-direction=bottom]`), not a
  prop.
- **FR-006**: On mobile the map's top-left zoom controls MUST be offset clear of
  the floating trigger (no overlap).

## Accessibility

- Full keyboard path to open and close the Drawer (vaul focus trap + Esc).
- The Drawer exposes an accessible name/description (`sr-only` `DrawerTitle` /
  `DrawerDescription`); the trigger has a descriptive `aria-label`.
- Honors `prefers-reduced-motion` via the global motion guard.

## Acceptance (verified)

Confirmed via the `run-app` browser driver (`.claude/skills/run-app`) at a 390px
viewport on 2026-06-01: the drawer trigger is visible (FR-002) and the trigger
and zoom controls do not overlap (FR-006, `trigger@15` vs `zoom@63`). Display of
`SidebarContent` is covered by `components/scene/sidebar-region.test.tsx`.

## Out of Scope

- The analysis **content** inside the panel (KPI tiles, charts, room-type
  filters, price slider) is deferred to **E4/E5**; today the panel shows the
  market-snapshot header stub. The 44px touch targets in the design apply to
  those controls and land with them.
- Drawer snap-points / a collapsed "peek" state — current behavior is simple
  open/close (chosen deliberately while the content is still a stub).

## Implementation Pointers

- `components/scene/scene-drawer.tsx` — `"use client"` Drawer + map-chrome trigger.
- `components/scene/sidebar-region.tsx` — `SidebarContent` (shared) + desktop
  `SidebarRegion` aside (`hidden lg:flex`).
- `components/scene/city-scene.tsx` — flex-column → `lg:grid`; mounts the Drawer.
- `components/ui/drawer.tsx` — shadcn/vaul primitive.
