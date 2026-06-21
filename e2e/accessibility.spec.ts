import { expect, test } from "./support";
import {
  expectNoSeriousA11yViolations,
  freezeAnimations,
  switchToLight,
} from "./support/a11y";

/**
 * These specs gate **color-contrast**, the one axe rule jsdom can't evaluate (it
 * does no layout or paint). Structural a11y — roles, names, alt, heading order,
 * list nesting — is already asserted per-region by the `vitest-axe` integration
 * tests, which run earlier and cheaper, so it isn't re-checked here. Each surface
 * below renders distinct tokens the resting home/scene scans never reach.
 */
test.describe("accessibility (axe serious/critical)", () => {
  test("home page is axe-clean in dark and light", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await freezeAnimations(page);
    await expectNoSeriousA11yViolations(page, testInfo, "home/dark");
    await switchToLight(page);
    await expectNoSeriousA11yViolations(page, testInfo, "home/light");
  });

  test("city scene is axe-clean in dark and light", async ({
    page,
  }, testInfo) => {
    await page.goto("/london");
    await freezeAnimations(page);
    // The contrast gate scans the scene chrome (sidebar + over-map controls),
    // which renders independently of the WebGL map — so wait for the panel to
    // stream in, not for map tiles. Avoiding the map keeps the a11y check fast
    // and free of WebGL flakiness; legends floating over the canvas are reported
    // by axe as `incomplete`, never `violations`, so they don't need it loaded.
    await expect(
      page.getByRole("complementary", { name: "Market analysis" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Price distribution" }),
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page, testInfo, "scene/dark");

    await switchToLight(page);
    await expectNoSeriousA11yViolations(page, testInfo, "scene/light");
  });

  test("browse listing panel is axe-clean in dark and light", async ({
    page,
  }, testInfo) => {
    await page.goto("/london?lens=browse");
    await freezeAnimations(page);
    await expect(
      page.getByRole("complementary", { name: "Market analysis" }),
    ).toBeVisible();
    // The list streams from worker data, independent of the WebGL map — wait on
    // a listing card, not tiles. Cold prod start can be slow, hence the bump.
    await expect(
      page.getByRole("button", { name: /open details/i }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expectNoSeriousA11yViolations(page, testInfo, "browse/dark");

    await switchToLight(page);
    await expectNoSeriousA11yViolations(page, testInfo, "browse/light");
  });

  test("listing detail drawer is axe-clean in dark and light", async ({
    page,
  }, testInfo) => {
    await page.goto("/london?lens=browse");
    await freezeAnimations(page);
    await expect(
      page.getByRole("complementary", { name: "Market analysis" }),
    ).toBeVisible();
    const firstCard = page
      .getByRole("button", { name: /open details/i })
      .first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });

    const close = page.getByRole("button", { name: "Close listing details" });
    const openDrawer = async () => {
      await firstCard.click();
      await expect(close).toBeVisible();
    };

    await openDrawer();
    await expectNoSeriousA11yViolations(page, testInfo, "listing-detail/dark");

    // The drawer is modal, so the rest of the page (incl. the theme toggle) goes
    // inert while it's open — close it before switching, then reopen to scan light.
    await close.click();
    await switchToLight(page);
    await openDrawer();
    await expectNoSeriousA11yViolations(page, testInfo, "listing-detail/light");
  });

  test.describe("mobile drawer", () => {
    // Below Tailwind's `lg` the sidebar collapses to a bottom drawer; 390px is a
    // typical phone width (mirrors mobile-layout.spec.ts).
    test.use({ viewport: { width: 390, height: 844 } });

    test("open market-analysis drawer is axe-clean", async ({
      page,
    }, testInfo) => {
      await page.goto("/london");
      await freezeAnimations(page);
      await page.getByRole("button", { name: /open market analysis/i }).click();
      await expect(
        page.getByRole("dialog", { name: /market analysis/i }),
      ).toBeVisible();
      // Dark only: the panel's light/dark contrast is already gated by the
      // desktop scene scan; the new surface here is the bottom-sheet layout at
      // phone width, and toggling theme behind the open scrim is needlessly flaky.
      await expectNoSeriousA11yViolations(page, testInfo, "mobile-drawer/dark");
    });
  });
});
