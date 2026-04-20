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
    // will rasterize without any strokes and the snapshots will lock to that
    // blank state forever.
    //
    // Check: count pixels within tight tolerance of the expected resolved
    // stroke color (#ccc → rgb(204,204,204)), restricted to the plot area
    // so axis labels, titles, ticks, etc. can't satisfy the assertion.
    // Anti-aliasing at bar edges produces partial-opacity intermediates
    // (mixes of bar fill + transparent bg), not #ccc, so those don't count.
    await waitForChartReady(page, "histogram-stroke-light")

    const strokePixelCount = await page.evaluate(() => {
      const cell = document.querySelector('[data-testid="histogram-stroke-light"]') as HTMLElement | null
      if (!cell) return 0
      const canvas = cell.querySelector("canvas") as HTMLCanvasElement | null
      if (!canvas) return 0
      const ctx = canvas.getContext("2d")
      if (!ctx) return 0

      // The fixture sets margin={{ top: 20, right: 20, bottom: 30, left: 50 }}
      // on a 520×200 chart. The plot area excludes axis labels/ticks.
      // Margin is in CSS pixels; canvas backing store may be device-pixel-scaled
      // (devicePixelRatio). Read dpr off the canvas style vs backing size.
      const dpr = canvas.width / parseFloat(canvas.style.width || String(canvas.width))
      const x0 = Math.floor(50 * dpr)
      const y0 = Math.floor(20 * dpr)
      const x1 = Math.floor((520 - 20) * dpr)
      const y1 = Math.floor((200 - 30) * dpr)

      const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data
      // Stroke color is resolved from --semiotic-border which is #ccc in LIGHT_THEME → rgb(204,204,204).
      let strokePx = 0
      for (let i = 0; i < img.length; i += 4) {
        const [r, g, b, a] = [img[i], img[i + 1], img[i + 2], img[i + 3]]
        if (a === 0) continue
        // Tight ±6 tolerance — loose enough for sub-pixel anti-aliasing along
        // a pure stroke segment, tight enough to exclude mixed fill+bg pixels.
        if (Math.abs(r - 204) < 6 && Math.abs(g - 204) < 6 && Math.abs(b - 204) < 6) {
          strokePx++
        }
      }
      return strokePx
    })

    // 20 bars × ~1px stroke along their outline paints well more than 20 strokes worth
    // of #ccc pixels even restricted to the plot area. <20 would mean stroke isn't painting.
    expect(strokePixelCount).toBeGreaterThan(50)
  })
})
