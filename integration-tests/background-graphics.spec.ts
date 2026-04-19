import { test, expect } from "@playwright/test"
import { waitForChartReady } from "./helpers"

/**
 * Regression guard for background-graphics rendering.
 *
 * Before the fix: StreamXYFrame and StreamOrdinalFrame unconditionally
 * painted the theme background (`--semiotic-bg`) across the entire
 * canvas, which sat in front of the user-provided `<backgroundGraphics>`
 * SVG in DOM order. That meant the SVG rendered but was visually
 * covered — e.g. the DRAFT watermark on /theming/styling and the
 * baseball-field diamond on /cookbook/homerun-map both went blank.
 *
 * The fix: when `backgroundGraphics` is provided, the frame skips the
 * canvas theme-bg fill so the SVG behind the canvas shows through.
 *
 * This test verifies the fix at the level of rendered pixels — both
 * (a) the user's marker element is present in the DOM, and
 * (b) sampling a pixel inside the chart margins where no data marks
 * are drawn finds the canvas transparent (alpha === 0), proving the
 * SVG background is visible.
 */

test.describe("Background Graphics Rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/background-graphics-examples/")
  })

  test("StreamXYFrame backgroundGraphics SVG renders and canvas does not cover it", async ({ page }) => {
    await waitForChartReady(page, "xy-background")
    const testCase = page.locator('[data-testid="xy-background"]')

    // (a) The user's marker elements reach the DOM
    await expect(testCase.locator('[data-testid="bg-marker-xy"]')).toHaveCount(1)
    await expect(testCase.locator('[data-testid="bg-text-xy"]')).toHaveText("XY-BG-OK")

    // (b) Canvas is transparent over the margin area (where no data
    // marks are drawn). A regressed fill-the-whole-canvas would show
    // alpha=255 here and hide the SVG below.
    const marginAlpha = await testCase.evaluate((el) => {
      const canvas = el.querySelector("canvas[aria-label]") as HTMLCanvasElement | null
      if (!canvas) return -1
      const ctx = canvas.getContext("2d")
      if (!ctx) return -1
      // Sample at (5, 5) — well inside the top-left margin (50px left, 30px top),
      // definitely outside any data-mark region.
      const data = ctx.getImageData(5, 5, 1, 1).data
      return data[3]
    })
    expect(marginAlpha).toBe(0)
  })

  test("BarChart frameProps.backgroundGraphics SVG renders and canvas does not cover it", async ({ page }) => {
    await waitForChartReady(page, "bar-background")
    const testCase = page.locator('[data-testid="bar-background"]')

    await expect(testCase.locator('[data-testid="bg-marker-bar"]')).toHaveCount(1)
    await expect(testCase.locator('[data-testid="bg-text-bar"]')).toHaveText("BAR-BG-OK")

    const marginAlpha = await testCase.evaluate((el) => {
      const canvas = el.querySelector("canvas[aria-label]") as HTMLCanvasElement | null
      if (!canvas) return -1
      const ctx = canvas.getContext("2d")
      if (!ctx) return -1
      const data = ctx.getImageData(5, 5, 1, 1).data
      return data[3]
    })
    expect(marginAlpha).toBe(0)
  })

  test("LineChart HOC threading backgroundGraphics through frameProps works", async ({ page }) => {
    await waitForChartReady(page, "linechart-background")
    const testCase = page.locator('[data-testid="linechart-background"]')

    // Same marker as the XY direct-frame case — LineChart wraps StreamXYFrame
    // so the user's graphics should reach it via frameProps pass-through.
    await expect(testCase.locator('[data-testid="bg-marker-xy"]')).toHaveCount(1)

    const marginAlpha = await testCase.evaluate((el) => {
      const canvas = el.querySelector("canvas[aria-label]") as HTMLCanvasElement | null
      if (!canvas) return -1
      const ctx = canvas.getContext("2d")
      if (!ctx) return -1
      const data = ctx.getImageData(5, 5, 1, 1).data
      return data[3]
    })
    expect(marginAlpha).toBe(0)
  })
})
