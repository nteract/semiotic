import { test, expect } from "@playwright/test"
import { waitForChartReady } from "./helpers"

/**
 * Chart-mode visual regression matrix.
 *
 * Four HOCs × three modes (primary / context / sparkline) = 12 fixtures.
 * Regression guard against the sparkline/context bugs fixed 2026-04-21:
 *   • DonutChart — innerRadius literal (60) exceeded the outer radius at
 *     sparkline 120×24, inverting the ring. Now scales with size.
 *   • GaugeChart — `width: props.width ?? 300` swallowed the mode-default
 *     size. Now threaded via useChartMode primaryDefaults.
 *   • SwimlaneChart — axes stayed on in sparkline/context. Now showAxes
 *     participates in mode resolution via `resolved.showAxes`.
 *   • RealtimeHistogram — only dimensions were mode-driven; axis chrome
 *     crowded 120×24. Now showAxes participates in mode resolution.
 *     (showLegend isn't wired because the HOC doesn't construct a `legend`
 *     prop for StreamXYFrame — there's no legend surface to suppress.)
 *
 * Candlestick is not covered here — it's only available via
 * `chartType="candlestick"` on StreamXYFrame, not an HOC with a `mode` prop.
 *
 * Update baselines after intentional rendering changes:
 *   npx playwright test integration-tests/chart-modes.spec.ts --update-snapshots
 */

const CHARTS = ["donut", "gauge", "swimlane", "histogram"] as const
const MODES = ["primary", "context", "sparkline"] as const

test.describe("Chart modes — sparkline/context/primary matrix", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart-modes-examples/")
  })

  for (const chart of CHARTS) {
    for (const mode of MODES) {
      const testId = `${chart}-${mode}`
      test(`${chart} in ${mode} mode`, async ({ page }) => {
        await waitForChartReady(page, testId)
        const cell = page.locator(`[data-testid="${testId}"]`)
        await expect(cell).toHaveScreenshot(`${testId}.png`, {
          // Canvas anti-aliasing varies slightly across GPUs; 200px absorbs
          // that while still catching structural regressions (ring inversion,
          // axis chrome intruding, etc.).
          maxDiffPixels: 200,
          // Firefox-linux's implicit font wait has flaked on other matrices;
          // 15s is generous and matches the themed-charts convention.
          timeout: 15000,
        })
      })
    }
  }
})
