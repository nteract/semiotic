import { test, expect } from "@playwright/test"
import { waitForChartReady } from "./helpers"

/**
 * Themed visual regression: one canonical chart per family, rendered under
 * each of a curated set of theme presets, snapshotted per (chart × theme).
 *
 * Why this exists: the bulk of theme-driven rendering (categorical palettes,
 * background colors, gridline colors, selectionOpacity, typography) only
 * shows up visually. Unit tests check structure; this catches the colors.
 *
 * Update baselines after intentional rendering changes:
 *   npx playwright test integration-tests/themed-charts.spec.ts --update-snapshots
 * For Linux baselines (the CI regression gate), see TESTING_BASELINE.md.
 *
 * Each chart picked here has deterministic layout — `sankey` (analytic
 * d3-sankey) replaced an earlier `force` (ForceDirectedGraph) because
 * force-layout's floating-point math drifts across JS engines, breaking
 * the cross-browser regression gate even at high iteration counts. Layout
 * coverage for force-directed graphs lives in network-frame.spec.ts.
 */

const CHARTS = ["line", "scatter", "bar", "pie", "sankey", "choropleth"] as const
const THEMES = ["light", "dark", "tufte", "pastels", "bi-tool-dark"] as const

test.describe("Themed charts — visual matrix", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/themed-examples/")
  })

  for (const theme of THEMES) {
    for (const chart of CHARTS) {
      const testId = `themed-${chart}-${theme}`
      test(`${chart} renders correctly under ${theme} theme`, async ({ page }) => {
        await waitForChartReady(page, testId)
        const cell = page.locator(`[data-testid="${testId}"]`)
        await expect(cell).toHaveScreenshot(`${testId}.png`, {
          // Some sub-pixel variance is unavoidable on canvas (anti-aliasing,
          // GPU/font differences). 200px tolerance is enough to absorb that
          // while still catching color-channel-level changes.
          maxDiffPixels: 200,
          // Firefox-linux occasionally times out on Playwright's implicit font
          // wait under CI load (seen on dark-theme bar renders). 15s gives
          // comfortable headroom; once fonts are loaded the compare is instant.
          timeout: 15000,
        })
      })
    }
  }
})
