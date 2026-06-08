---
name: run-app
description: Browser-drive and visually verify the Plainsight Next.js scene with a real Chromium, MapLibre WebGL, SwiftShader, Playwright, and axe-core. Use after changes under components/scene, components/theme, app/[city], map styles, responsive layout, interactions, hydration, or accessibility; use whenever unit tests cannot prove that the rendered map and UI actually work.
---

# Run App

Run the real Plainsight scene in Chromium, collect a complete behavioral report,
capture screenshots, and inspect the pixels before reporting success.

## Workflow

1. Run setup only when the isolated driver dependencies are missing:

   ```bash
   bash .agents/skills/run-app/scripts/setup.sh
   ```

2. Run the verifier from the repository root:

   ```bash
   bash .agents/skills/run-app/scripts/verify.sh amsterdam
   ```

   Replace `amsterdam` with the requested city. Set `BASE_URL` to reuse a server
   on another address. The wrapper reuses an answering server or starts a
   temporary `pnpm dev` server.

3. If Chromium launch or local server binding fails with sandbox permission
   errors, rerun the same verifier command with escalated permissions. Do not
   treat a sandbox launch failure as an application failure.

4. Next.js refuses a second dev server for the same repository. When the
   wrapper reports an existing server, reuse its origin instead of selecting a
   different port. Prefer the default `http://localhost:3000` origin because
   Next development resources may reject `127.0.0.1` as cross-origin.

5. Read the terminal PASS/FAIL report and
   `/tmp/plainsight-run-app/report.json`. Report every failed check and the
   associated detail. A nonzero verifier exit is expected when checks fail; do
   not stop analysis at the exit code.

6. Use `view_image` on every screenshot created in
   `/tmp/plainsight-run-app/`, especially:
   - `<city>-dark.png`
   - `<city>-light.png`
   - `<city>-mobile.png`
   - `<city>-failure.png`, when present

   A green DOM checklist over a blank, clipped, obscured, or visually broken map
   is a failure. State what is visibly rendered and any defects observed.

## Verification Contract

The driver checks:

- No client runtime errors or Next.js development error overlay.
- Dark default theme and in-place light-theme swap.
- Real MapLibre canvas, attribution, legend, and non-fallback map rendering.
- Keyboard map pan.
- Serious/critical axe violations in dark and light themes.
- Mobile drawer trigger visibility and control overlap.
- Reduced-motion rendering.
- Tile-failure fallback.

The verifier writes a JSON report even when an individual check throws. A
browser-launch failure can prevent report creation; surface its launch logs
clearly.

## Rules

- Always inspect screenshots before claiming visual success.
- Distinguish application failures from verifier/environment failures.
- Do not edit application code merely to make a brittle verifier pass.
- Keep generated screenshots and reports under `/tmp`, not in the repository.
- Do not install Playwright into the application package; use this skill's
  isolated `driver/package.json`.
