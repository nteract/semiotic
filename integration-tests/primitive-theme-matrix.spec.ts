import { test, expect } from "@playwright/test"
import { waitForChartReady } from "./helpers"

/**
 * Primitive-theme matrix for Ordinal / Network / Geo Stream Frames.
 *
 * Milestone 2 of the primitive-theming plan: prove that `themeSemantic`
 * reaches each of the three non-XY frames and changes the DEFAULT fallback
 * colors when the user doesn't supply explicit style props. The XY frame
 * has its own spec (histogram-theme-stroke.spec.ts).
 *
 * Three charts × two themes = six snapshots. In dark mode, default
 * borders / surfaces / strokes come from the theme and look measurably
 * different from the light-mode equivalents. Before milestone 2 these
 * defaults were hardcoded (`#999`, `#4e79a7`, `#fff`) regardless of
 * theme, so the dark snapshots would look like the light ones.
 *
 * Update baselines after intentional rendering changes:
 *   npx playwright test integration-tests/primitive-theme-matrix.spec.ts --update-snapshots
 */

const CHARTS = ["funnel", "tree", "choropleth"] as const
const THEMES = ["light", "dark"] as const

test.describe("Primitive-theme matrix — Ordinal / Network / Geo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/primitive-theme-matrix-examples/")
  })

  for (const chart of CHARTS) {
    for (const theme of THEMES) {
      const testId = `${chart}-${theme}`
      test(`${chart} renders correctly under ${theme} theme`, async ({ page }) => {
        await waitForChartReady(page, testId)
        const cell = page.locator(`[data-testid="${testId}"]`)
        await expect(cell).toHaveScreenshot(`${testId}.png`, {
          // Same tolerance as themed-charts.spec.ts — enough to absorb
          // sub-pixel anti-aliasing while catching color-channel regressions.
          maxDiffPixels: 200,
        })
      })
    }
  }
})
