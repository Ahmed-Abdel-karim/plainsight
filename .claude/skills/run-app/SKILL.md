---
name: run-app
description: >-
  Launch and browser-drive the Plainsight scene (Next.js 16 + MapLibre/WebGL) to
  visually verify the themed base map and responsive layout — produces real
  dark/light/mobile screenshots plus a PASS/FAIL report. Use this whenever you
  need to actually SEE the app working: confirming the map renders, the theme
  toggle swaps the basemap in place, POI-free / attribution / legend, mobile
  reflow, or checking a change to anything under components/scene/, the map,
  next-themes, or app/[city]. Prefer this over SSR curls — the map is client-only
  WebGL that does not render in jsdom or a server fetch.
---

# Run & verify the Plainsight scene

The map region is **client-only MapLibre WebGL** fetching OpenFreeMap vector
tiles. It renders in neither `vitest`/jsdom (`getContext` is unimplemented) nor a
server-side `curl` (the canvas is painted on the client). So "does the map
actually work" can only be answered by driving a real browser. This skill does
that headlessly with Playwright + SwiftShader (no GPU needed) and asserts the
basemap acceptance items, leaving screenshots you can look at.

## When to reach for it

- Verifying anything under `components/scene/` (map, sidebar, drawer), the map
  styles, `next-themes` wiring, or `app/[city]`.
- Confirming the dark default, the in-place light (positron) swap, POI-free
  canvas, visible attribution, the themed legend, or mobile reflow.
- After any change that could affect SSR/hydration of the scene — the driver
  fails on client runtime/hydration errors that SSR checks miss.

## One-time setup

```bash
bash .claude/skills/run-app/scripts/setup.sh
```

Installs Playwright + Chromium into `driver/` (kept **out** of the app's
`package.json`). If Chromium can't launch because the host lacks its shared
libraries and there's no `sudo` (common in sandboxes), the script fetches them
rootlessly via `apt-get download` into `/tmp/pwlibs` — `verify.sh` then exports
`LD_LIBRARY_PATH` automatically. On a normal dev machine with a browser already
present, the fallback is skipped.

## Run it

```bash
bash .claude/skills/run-app/scripts/verify.sh            # /amsterdam
bash .claude/skills/run-app/scripts/verify.sh berlin     # any city slug
```

It **reuses a dev server already on :3000** (Next refuses a second `next dev`)
and only starts `pnpm dev` itself if nothing answers. Then it drives
`driver/shoot.mjs`, prints a PASS/FAIL line per check, and writes PNGs to
`/tmp/plainsight-shots/` — `<city>-dark.png`, `-light.png`, `-mobile.png`.

**Always open the screenshots and look.** A green checklist over a blank canvas
is still a failure; the checks confirm the DOM, the images confirm the pixels.

## What it asserts

| Check                                              | Requirement                                      |
| -------------------------------------------------- | ------------------------------------------------ |
| no client runtime/hydration errors                 | catches `pageerror` the SSR curl can't see       |
| dark is the default theme                          | FR-001                                           |
| WebGL map rendered (no "Map unavailable")          | FR-013                                           |
| MapLibre canvas present                            | FR-013                                           |
| provider attribution control present               | FR-015                                           |
| themed legend present                              | FR-012                                           |
| axe: no serious/critical violations (dark + light) | FR-009 / Rule 6 (axe-clean)                      |
| map is keyboard-pannable                           | FR/T008 (arrow keys move the canvas)             |
| theme swap did NOT reload the page                 | FR-005 (a `window` sentinel survives the toggle) |
| map still present after light swap                 | FR-006                                           |
| renders under prefers-reduced-motion               | FR-010                                           |
| "Map unavailable" fallback when tiles fail         | FR-011 (route-aborts the tile host)              |
| mobile drawer trigger visible                      | CR-002                                           |
| trigger and zoom controls do NOT overlap           | CR-002                                           |

> **Contrast (FR-009/T016):** axe cannot compute contrast for the legend and
> attribution because they float over the WebGL canvas (reported "incomplete",
> not pass/fail). The driver confirms no _other_ contrast violations; a precise
> AA-ratio check on those two over-map nodes stays a manual/screenshot step.

## Gotchas worth knowing (learned the hard way)

- **WebGL needs SwiftShader.** The driver launches with `--enable-unsafe-swiftshader
--use-gl=angle --use-angle=swiftshader`; without them MapLibre falls back to the
  "Map unavailable" state.
- **The theme toggle's `aria-label` is unreliable at first paint** (a next-themes
  hydration quirk — it can read "Switch to dark theme" while dark is already
  active). Select it by the `button[aria-label^="Switch to"]` prefix and assert
  the swap via the `<html>` `.dark` class, which is the source of truth.
- **Don't start a second dev server** — reuse :3000.
- The benign `Image "wood-pattern" could not be loaded` console warning is an
  OpenFreeMap sprite quirk, not a failure.

## Files

- `driver/shoot.mjs` — the Playwright driver (edit here to add checks/cities).
- `driver/package.json` — pins `playwright`; `node_modules` is git-ignored.
- `scripts/setup.sh` / `scripts/verify.sh` — setup and run wrappers.
