import { test, expect } from "@playwright/test"
import { waitForChartReady } from "./helpers"

/**
 * Status-aware + scale theme matrix for Phase A milestone 3.
 *
 * Three charts exercise the three plumbing paths added in milestone 3:
 *   • Waterfall    → themeSemantic.success / .danger defaults
 *   • Heatmap      → theme.colors.sequential default scheme
 *   • LikertChart  → theme.colors.diverging default scheme
 *
 * Each rendered without explicit color props so the theme-fallback path
 * fires. Light vs dark pairs diverge wherever the theme actually changes
 * the relevant scale.
 *
 * Update baselines after intentional rendering changes:
 *   npx playwright test integration-tests/status-scale-theme-matrix.spec.ts --update-snapshots
 */

const CASES: Array<{ chart: string; themeA: string; themeB: string }> = [
  { chart: "waterfall", themeA: "light",   themeB: "dark" },
  { chart: "heatmap",   themeA: "tufte",   themeB: "bi-tool" },
  { chart: "likert",    themeA: "light",   themeB: "dark" },
]

test.describe("Status-aware + scale theme matrix", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/status-scale-theme-examples/")
  })

  for (const { chart, themeA, themeB } of CASES) {
    for (const theme of [themeA, themeB]) {
      const testId = `${chart}-${theme}`
      test(`${chart} renders correctly under ${theme} theme`, async ({ page }) => {
        await waitForChartReady(page, testId)
        const cell = page.locator(`[data-testid="${testId}"]`)
        await expect(cell).toHaveScreenshot(`${testId}.png`, { maxDiffPixels: 200 })
      })
    }
  }
})
