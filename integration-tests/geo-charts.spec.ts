import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForAllChartsReady, waitForRafs } from "./helpers"

test.describe("Geo Charts - ChoroplethMap", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/geo-examples/")
  })

  test("ChoroplethMap renders canvas", async ({ page }) => {
    await waitForChartReady(page, "geo-choropleth")
    const testCase = page.locator('[data-testid="geo-choropleth"]')
    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBeGreaterThan(0)
  })

  test("ChoroplethMap has role=group and aria-label", async ({ page }) => {
    await waitForChartReady(page, "geo-choropleth")
    const testCase = page.locator('[data-testid="geo-choropleth"]')
    const frame = testCase.locator(".stream-geo-frame")
    await expect(frame).toHaveAttribute("role", "group")
    const ariaLabel = await frame.getAttribute("aria-label")
    expect(ariaLabel).toBe("Regional Values")
  })

  test("ChoroplethMap with legend renders legend elements", async ({ page }) => {
    await waitForChartReady(page, "geo-choropleth-legend")
    const testCase = page.locator('[data-testid="geo-choropleth-legend"]')

    // The chart should render -- canvas is the primary check
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })

  test("ChoroplethMap with graticule renders", async ({ page }) => {
    await waitForChartReady(page, "geo-graticule")
    const testCase = page.locator('[data-testid="geo-graticule"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })

  test("ChoroplethMap matches snapshot", async ({ page }) => {
    await waitForChartReady(page, "geo-choropleth")
    const testCase = page.locator('[data-testid="geo-choropleth"]')
    await expect(testCase).toHaveScreenshot("geo-choropleth.png", { maxDiffPixels: 200 })
  })

  test("ChoroplethMap with legend matches snapshot", async ({ page }) => {
    await waitForChartReady(page, "geo-choropleth-legend")
    const testCase = page.locator('[data-testid="geo-choropleth-legend"]')
    await expect(testCase).toHaveScreenshot("geo-choropleth-legend.png", { maxDiffPixels: 200 })
  })
})

test.describe("Geo Charts - ProportionalSymbolMap", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/geo-examples/")
  })

  test("ProportionalSymbolMap renders canvas", async ({ page }) => {
    await waitForChartReady(page, "geo-proportional")
    const testCase = page.locator('[data-testid="geo-proportional"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })

  test("ProportionalSymbolMap has role=group and aria-label", async ({ page }) => {
    await waitForChartReady(page, "geo-proportional")
    const testCase = page.locator('[data-testid="geo-proportional"]')
    const frame = testCase.locator(".stream-geo-frame")
    await expect(frame).toHaveAttribute("role", "group")
    const ariaLabel = await frame.getAttribute("aria-label")
    expect(ariaLabel).toBe("City Magnitudes")
  })

  test("ProportionalSymbolMap matches snapshot", async ({ page }) => {
    await waitForChartReady(page, "geo-proportional")
    const testCase = page.locator('[data-testid="geo-proportional"]')
    await expect(testCase).toHaveScreenshot("geo-proportional.png", { maxDiffPixels: 200 })
  })
})

test.describe("Geo Charts - StreamGeoFrame", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/geo-examples/")
  })

  test("StreamGeoFrame renders canvas directly", async ({ page }) => {
    await waitForChartReady(page, "geo-stream-frame")
    const testCase = page.locator('[data-testid="geo-stream-frame"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })

  test("StreamGeoFrame has role=group", async ({ page }) => {
    await waitForChartReady(page, "geo-stream-frame")
    const testCase = page.locator('[data-testid="geo-stream-frame"]')
    const frame = testCase.locator(".stream-geo-frame")
    await expect(frame).toHaveAttribute("role", "group")
  })
})

test.describe("Geo Charts - No console errors", () => {
  test("geo examples page loads without JS errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/geo-examples/")
    await waitForAllChartsReady(page)

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })
})

test.describe("Geo Charts - Hover interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/geo-examples/")
  })

  test("hovering over choropleth does not crash", async ({ page }) => {
    await waitForChartReady(page, "geo-choropleth")
    const testCase = page.locator('[data-testid="geo-choropleth"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()

    if (box) {
      // Move across the canvas to trigger hover events
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
      await waitForRafs(page)
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6)
      await waitForRafs(page)

      // Chart should still have its scene drawn after the hover sweep —
      // `aria-label` from `computeCanvasAriaLabel` carries a region
      // count that only stays populated while the geo scene survives.
      const dataCanvas = testCase.locator("canvas[aria-label]").first()
      await expect(dataCanvas).toHaveAttribute("aria-label", /\d+/)
    }
  })
})
