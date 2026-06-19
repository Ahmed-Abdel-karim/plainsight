import { expect, test } from "./support";

// Below Tailwind's `lg` breakpoint (1024px) the desktop sidebar collapses to a
// bottom drawer. 390px is a typical phone width.
test.use({ viewport: { width: 390, height: 844 } });

test("mobile swaps the desktop sidebar for the drawer", async ({ page }) => {
  await page.goto("/london");

  // The `<aside>` is `display:none` below `lg`, so it leaves the a11y tree.
  await expect(
    page.getByRole("complementary", { name: "Market analysis" }),
  ).toHaveCount(0);

  const trigger = page.getByRole("button", { name: /open market analysis/i });
  await expect(trigger).toBeVisible();
  await trigger.click();

  await expect(
    page.getByRole("dialog", { name: /market analysis/i }),
  ).toBeVisible();
});
