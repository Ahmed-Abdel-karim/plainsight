import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";

import { expect } from "./index";

/**
 * A consistently configured axe scanner shared by every a11y spec. Scoping to
 * the WCAG 2.0/2.1 A and AA rule tags makes the gate an explicit AA target
 * (matching the standard most teams are held to) rather than axe's full rule
 * set; the serious/critical impact filter in `expectNoSeriousA11yViolations`
 * then narrows further. Callers may chain `.include()`/`.exclude()` per scan.
 */
export function makeAxeBuilder(page: Page): AxeBuilder {
  return new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);
}

/**
 * Fail only on serious/critical axe violations, mirroring the run-app driver.
 * The legend and attribution float over the WebGL canvas, where axe can't read
 * the pixels behind them — it reports those as `incomplete`, never `violations`,
 * so asserting on serious/critical violations already excludes them.
 *
 * On failure the offending nodes (rule, target, measured contrast, summary) are
 * attached and inlined in the assertion message so a red run is actionable.
 */
export async function expectNoSeriousA11yViolations(
  page: Page,
  testInfo: TestInfo,
  label: string,
): Promise<void> {
  const { violations } = await makeAxeBuilder(page).analyze();
  const serious = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const report = serious.flatMap((v) =>
    v.nodes.map((node) => ({
      rule: v.id,
      impact: v.impact,
      target: node.target.join(" "),
      data: node.any[0]?.data,
      summary: node.failureSummary,
    })),
  );
  if (report.length > 0) {
    await testInfo.attach(`axe-${label}`, {
      body: JSON.stringify(report, null, 2),
      contentType: "application/json",
    });
  }
  expect(
    serious,
    `serious/critical a11y violations on ${label}:\n${JSON.stringify(report, null, 2)}`,
  ).toEqual([]);
}

/**
 * Freeze CSS transitions/animations so axe samples settled colors. The theme
 * swap and card hovers animate via `transition-colors`; without this, axe can
 * pair a settled text color against a mid-transition background and report a
 * contrast failure that doesn't exist in the resting UI (which is what AA
 * governs). Inject after each navigation, before any scan or theme toggle.
 */
export async function freezeAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      "*,*::before,*::after{transition:none!important;animation:none!important}",
  });
}

/** Flip dark → light in place and wait for the `<html>` class (source of truth). */
export async function switchToLight(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.waitForFunction(
    () => !document.documentElement.classList.contains("dark"),
    null,
    { timeout: 10_000 },
  );
}
