# Quickstart: City Establishes the Default Analysis Scope

## Prerequisites

- Dependencies installed with `pnpm install`.
- Active feature branch: `002-city-default-scope`.

## Build And Static Checks

```bash
pnpm format:check
pnpm lint:strict
pnpm build
```

## Manual Acceptance

1. Start the app:

   ```bash
   pnpm dev
   ```

2. From `http://localhost:3000/`, select a city (or open `/london` directly).

3. City-scope scene (US1):
   - Confirm the page shows a scene with both a map region and a sidebar region — neither is blank or missing.
   - Confirm the content describes the whole city (no neighbourhood or filtered subset is selected).

4. Scope label (US2):
   - Confirm the scope label shows the city name and the city's total listing count with digit grouping, e.g. `London · 61,963 listings`.
   - Open another city (e.g. `/amsterdam`) and confirm the label reflects that city's own name and total (`Amsterdam · 5,874 listings`).

5. Unknown slug → graceful not-found (US3):
   - Open `/atlantis` (not a supported city).
   - Confirm a graceful not-found view appears — no crash, no raw error, no blank map, and no city scene regions.
   - Confirm a clearly labelled action back to the city picker is present.
   - Click it and confirm you land on `/` and can select a supported city.

6. Keyboard check (US3 / accessibility):
   - On the not-found view, Tab to the back-to-picker action and confirm a visible focus ring.
   - Press Enter and confirm navigation to `/`.

7. Theme + responsive check:
   - Toggle dark/light and confirm the scope label, scene regions, and not-found view stay readable.
   - Narrow to mobile width and confirm the regions reflow without hiding the scope label or either region.

8. Reload/share check:
   - Reload a supported city route and confirm the same city-scoped scene renders (scope is URL-derived).
