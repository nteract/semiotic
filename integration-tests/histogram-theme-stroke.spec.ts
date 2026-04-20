import { test, expect } from "@playwright/test"
import { waitForChartReady } from "./helpers"

/**
 * RealtimeHistogram theme-aware stroke regression.
 *
 * Exercises Phase A of the primitive-theming cleanup end-to-end:
 * `stroke` prop on RealtimeHistogram → `barStyle` on StreamXYFrame →
 * PipelineConfig → barScene → RectSceneNode → canvas renderer.
 *
 * Three snapshots:
 *  1. light — stroke=var(--semiotic-border) resolves to the light theme's #ccc
 *  2. dark — same prop, cascaded --semiotic-border is #555
 *  3. scoped — a parent div's inline --semiotic-border override cascades
 *     through ThemeProvider into the canvas via getComputedStyle
 *
 * Before Phase A, `barStyle` was destructured in StreamXYFrame and dropped
 * before reaching the scene — these snapshots would show strokeless bars.
 *
 * Update baselines after intentional rendering changes:
 *   npx playwright test integration-tests/histogram-theme-stroke.spec.ts --update-snapshots
 */

test.describe("RealtimeHistogram — theme-aware stroke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/histogram-theme-stroke-examples/")
  })

  test("light theme — stroke resolves from --semiotic-border", async ({ page }) => {
    await waitForChartReady(page, "histogram-stroke-light")
    const cell = page.locator(`[data-testid="histogram-stroke-light"]`)
    await expect(cell).toHaveScreenshot("histogram-stroke-light.png", { maxDiffPixels: 200 })
  })

  test("dark theme — same prop, cascaded value", async ({ page }) => {
    await waitForChartReady(page, "histogram-stroke-dark")
    const cell = page.locator(`[data-testid="histogram-stroke-dark"]`)
    await expect(cell).toHaveScreenshot("histogram-stroke-dark.png", { maxDiffPixels: 200 })
  })

  test("scoped CSS var override reaches canvas", async ({ page }) => {
    await waitForChartReady(page, "histogram-stroke-scoped")
    const cell = page.locator(`[data-testid="histogram-stroke-scoped"]`)
    await expect(cell).toHaveScreenshot("histogram-stroke-scoped.png", { maxDiffPixels: 200 })
  })

  test("strokes actually paint (pixel check — no stroke = snapshot unstable)", async ({ page }) => {
    // Extra guard beyond the snapshots: if the CSS-cascade-read of the role
    // value ever returns "none" or an empty string on first paint, the canvas
    // will rasterize without any strokes and the snapshots will lock to a
    // blank state. Verify non-zero non-fill pixels directly.
    await waitForChartReady(page, "histogram-stroke-light")

    const hasStrokePixels = await page.evaluate(() => {
      const cell = document.querySelector('[data-testid="histogram-stroke-light"]') as HTMLElement | null
      if (!cell) return false
      const canvas = cell.querySelector("canvas") as HTMLCanvasElement | null
      if (!canvas) return false
      const ctx = canvas.getContext("2d")
      if (!ctx) return false
      const { width, height } = canvas
      const img = ctx.getImageData(0, 0, width, height).data
      // Count pixels that are neither transparent nor the two bar fills
      // (#C43B42 = 196,59,66 and #E8A838 = 232,168,56). Stroke is #ccc = 204,204,204.
      let strokey = 0
      for (let i = 0; i < img.length; i += 4) {
        const [r, g, b, a] = [img[i], img[i + 1], img[i + 2], img[i + 3]]
        if (a === 0) continue
        const isBarFill =
          (Math.abs(r - 196) < 20 && Math.abs(g - 59) < 20 && Math.abs(b - 66) < 20) ||
          (Math.abs(r - 232) < 20 && Math.abs(g - 168) < 20 && Math.abs(b - 56) < 20)
        if (isBarFill) continue
        const nearGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 150 && r < 240
        if (nearGray) strokey++
      }
      // Even a minimal 1px stroke on 20 bars should paint hundreds of gray pixels.
      return strokey > 100
    })

    expect(hasStrokePixels).toBe(true)
  })
})
