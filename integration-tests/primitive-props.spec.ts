import { test, expect } from "@playwright/test"
import { waitForChartReady } from "./helpers"

/**
 * Primitive-props matrix for Phase B.
 *
 * Six reference HOCs × three states (default / stroked / translucent):
 *   • BarChart / Scatterplot / LineChart       — XY primitives (B1)
 *   • BoxPlot                                  — ordinal summary (B2)
 *   • SankeyDiagram                            — network nodes + edges (B2)
 *   • RealtimeLineChart                        — realtime lineStyle.opacity (B2)
 *
 * Confirms the top-level `stroke` / `strokeWidth` / `opacity` props on
 * `BaseChartProps` reach every primitive family consistently end-to-end.
 * CSS-var-valued stroke (`var(--semiotic-border)`) also exercises the
 * cascade read into canvas.
 *
 * Update baselines after intentional rendering changes:
 *   npx playwright test integration-tests/primitive-props.spec.ts --update-snapshots
 */

const CHARTS = [
  "bar",
  "scatter",
  "line",
  "boxplot",
  "sankey",
  "realtime-line",
] as const
const STATES = ["default", "stroked", "translucent"] as const

test.describe("Primitive props — Phase B matrix", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/primitive-props-examples/")
  })

  for (const chart of CHARTS) {
    for (const state of STATES) {
      const testId = `${chart}-${state}`
      test(`${chart} in ${state} state`, async ({ page }) => {
        await waitForChartReady(page, testId)
        const cell = page.locator(`[data-testid="${testId}"]`)
        await expect(cell).toHaveScreenshot(`${testId}.png`, { maxDiffPixels: 200 })
      })
    }
  }
})
