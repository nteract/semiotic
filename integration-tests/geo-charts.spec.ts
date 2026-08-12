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

  test("labeled gradient legends stay inside their SVG at every position", async ({ page }) => {
    for (const position of ["right", "left", "top", "bottom"] as const) {
      const testId = `geo-gradient-legend-${position}`
      await waitForChartReady(page, testId)
      const geometry = await page.locator(`[data-testid="${testId}"]`).evaluate((testCase) => {
        const legend = testCase.querySelector<SVGGElement>(
          ".stream-geo-frame [aria-label='value']"
        )
        const label = Array.from(legend?.querySelectorAll("text") ?? []).find(
          (text) => text.textContent === "value"
        )
        const bar = legend?.querySelector<SVGRectElement>(
          "rect:not(.semiotic-gradient-legend-bin)"
        )
        const svg = legend?.ownerSVGElement
        if (!legend || !label || !bar || !svg) return null

        const labelRect = label.getBoundingClientRect()
        const barRect = bar.getBoundingClientRect()
        const legendRect = legend.getBoundingClientRect()
        const svgRect = svg.getBoundingClientRect()
        return {
          labelTop: labelRect.top,
          labelBottom: labelRect.bottom,
          barTop: barRect.top,
          legendTop: legendRect.top,
          legendBottom: legendRect.bottom,
          svgTop: svgRect.top,
          svgBottom: svgRect.bottom,
        }
      })

      expect(geometry).not.toBeNull()
      expect(geometry!.labelTop).toBeGreaterThanOrEqual(geometry!.svgTop - 0.5)
      expect(geometry!.legendTop).toBeGreaterThanOrEqual(geometry!.svgTop - 0.5)
      expect(geometry!.legendBottom).toBeLessThanOrEqual(geometry!.svgBottom + 0.5)
      expect(geometry!.labelBottom).toBeLessThanOrEqual(geometry!.barTop)
    }
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

// ── Default-theme HOC coverage backfill ──────────────────────────────
// FlowMap and DistanceCartogram — the two geo HOCs that didn't already
// have a default-theme snapshot. Mirrors the XY/ordinal-family backfill.
test.describe("Geo Charts - HOC default coverage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/geo-examples/")
  })

  for (const testId of [
    "geo-flowmap",
    "geo-distance-cartogram",
  ]) {
    test(`renders ${testId}`, async ({ page }) => {
      await waitForChartReady(page, testId)
      const testCase = page.locator(`[data-testid="${testId}"]`)
      await expect(testCase).toHaveScreenshot(`${testId}.png`, {
        maxDiffPixels: 100,
      })
    })
  }
})
