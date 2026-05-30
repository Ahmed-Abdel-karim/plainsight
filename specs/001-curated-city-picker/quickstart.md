# Quickstart: Curated City Picker

## Prerequisites

- Dependencies installed with `pnpm install`.
- Active feature branch: `001-curated-city-picker`.

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

2. Open `http://localhost:3000/`.

3. Confirm the landing page shows exactly these cards from `data/json/cities.json`:
   - Manchester
   - London
   - Berlin
   - Amsterdam

4. Confirm each card displays city name, country, market framing, tone, listing count, and snapshot label.

5. Click each card and confirm it navigates to the matching route:
   - `/manchester`
   - `/london`
   - `/berlin`
   - `/amsterdam`

6. Keyboard check:
   - Tab through every card.
   - Confirm each focused card has a visible focus ring.
   - Press Enter on a focused card and confirm navigation.
   - Return to `/`, focus another card, press Space, and confirm navigation.

7. Responsive check:
   - Verify the card grid works at desktop width.
   - Verify the card grid reflows on mobile width without hiding launch cities.

8. Unknown slug check:
   - Open `/not-a-launch-city`.
   - Confirm the app returns the not-found state.
