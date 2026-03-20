import { test, expect, Page } from "@playwright/test"

/**
 * Regression tests for bugs fixed in the 3.1.0 click-testing pass.
 *
 * These tests verify:
 * 1. Streaming (push API) charts render colored fills, not grey
 * 2. Streaming charts produce legends when showLegend is true
 * 3. Area chart tooltips show actual field values, not "-"
 * 4. LineChart streaming does not trigger infinite re-render loops
 * 5. Force-directed graphs center nodes within the canvas
 * 6. Streaming chord diagrams use multiple colors
 * 7. No runtime JS errors during streaming
 */

async function waitForStreaming(page: Page, testId: string, ms = 2500) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 8000 })
  // Wait for streaming data to push and render — use polling to handle slow CI
  await page.waitForTimeout(ms)
  // Additionally wait for the canvas to have non-empty content (non-transparent pixels)
  await page.waitForFunction(
    (id) => {
      const container = document.querySelector(`[data-testid="${id}"]`)
      if (!container) return false
      const canvas = container.querySelector("canvas") as HTMLCanvasElement
      if (!canvas || canvas.width === 0 || canvas.height === 0) return false
      const ctx = canvas.getContext("2d")
      if (!ctx) return false
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let nonEmpty = 0
      for (let i = 0; i < data.length; i += 64) {
        if (data[i + 3] > 50 && !(data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240)) nonEmpty++
      }
      return nonEmpty > 5
    },
    testId,
    { timeout: 10000 }
  ).catch(() => { /* proceed to assertion — it will fail with a clear message */ })
}

/**
 * Sample canvas pixels and return unique non-white, non-transparent colors.
 * Grey fills show up as rgb values where r ≈ g ≈ b (low saturation).
 * Colored fills have at least one channel significantly different.
 */
async function getCanvasColors(page: Page, testId: string): Promise<{
  hasColor: boolean
  hasGrey: boolean
  uniqueColors: number
  coloredPixels: number
  greyPixels: number
  canvasWidth: number
  canvasHeight: number
}> {
  return page.evaluate((id) => {
    const empty = { hasColor: false, hasGrey: true, uniqueColors: 0, coloredPixels: 0, greyPixels: 0, canvasWidth: 0, canvasHeight: 0 }
    const container = document.querySelector(`[data-testid="${id}"]`)
    if (!container) return empty
    const canvas = container.querySelector("canvas") as HTMLCanvasElement
    if (!canvas) return empty

    const ctx = canvas.getContext("2d")
    if (!ctx) return empty

    const w = canvas.width
    const h = canvas.height
    if (w === 0 || h === 0) return { ...empty, canvasWidth: w, canvasHeight: h }
    const data = ctx.getImageData(0, 0, w, h).data

    const colorSet = new Set<string>()
    let greyPixels = 0
    let coloredPixels = 0

    // Sample every 4th pixel for speed
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
      // Skip transparent and near-white/near-black pixels
      if (a < 50) continue
      if (r > 240 && g > 240 && b > 240) continue // white background
      if (r < 15 && g < 15 && b < 15) continue // black

      const maxC = Math.max(r, g, b)
      const minC = Math.min(r, g, b)
      const saturation = maxC > 0 ? (maxC - minC) / maxC : 0

      if (saturation < 0.1) {
        greyPixels++
      } else {
        coloredPixels++
        // Quantize to reduce noise
        const qr = Math.round(r / 32) * 32
        const qg = Math.round(g / 32) * 32
        const qb = Math.round(b / 32) * 32
        colorSet.add(`${qr},${qg},${qb}`)
      }
    }

    return {
      hasColor: coloredPixels > 10,
      hasGrey: greyPixels > coloredPixels && coloredPixels < 10,
      uniqueColors: colorSet.size,
      coloredPixels,
      greyPixels,
      canvasWidth: w,
      canvasHeight: h,
    }
  }, testId)
}

// ─── Grey fill regression tests ──────────────────────────────────────────────

test.describe("Streaming Color Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/streaming-regression-examples/")
  })

  const colorTestCases = [
    { testId: "regression-stacked-bar", name: "Stacked Bar", minColors: 2 },
    { testId: "regression-pie", name: "Pie", minColors: 2 },
    { testId: "regression-bubble", name: "Bubble", minColors: 2 },
    { testId: "regression-grouped-bar", name: "Grouped Bar", minColors: 2 },
    { testId: "regression-stacked-area", name: "Stacked Area", minColors: 2 },
    { testId: "regression-donut", name: "Donut", minColors: 2 },
    { testId: "regression-scatter", name: "Scatterplot", minColors: 2 },
  ]

  for (const { testId, name, minColors } of colorTestCases) {
    test(`${name} streaming uses colored fills, not grey`, async ({ page }) => {
      await waitForStreaming(page, testId)
      const colors = await getCanvasColors(page, testId)

      // Should have colored pixels, not just grey
      expect(colors.hasColor, `${name}: expected colored pixels but got coloredPixels=${colors.coloredPixels}, greyPixels=${colors.greyPixels}, canvasSize=${colors.canvasWidth}x${colors.canvasHeight}`).toBe(true)
      // Should have multiple distinct colors (one per category)
      expect(colors.uniqueColors).toBeGreaterThanOrEqual(minColors)
    })
  }

  test("Chord streaming uses multiple colors, not single blue", async ({ page }) => {
    await waitForStreaming(page, "regression-chord-streaming", 3000)
    const colors = await getCanvasColors(page, "regression-chord-streaming")
    expect(colors.hasColor).toBe(true)
    // Chord should have distinct colors for different nodes
    expect(colors.uniqueColors).toBeGreaterThanOrEqual(2)
  })
})

// ─── Legend regression tests ─────────────────────────────────────────────────

test.describe("Streaming Legend Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/streaming-regression-examples/")
  })

  const legendTestCases = [
    { testId: "regression-stacked-bar", name: "Stacked Bar" },
    { testId: "regression-pie", name: "Pie" },
    { testId: "regression-grouped-bar", name: "Grouped Bar" },
    { testId: "regression-donut", name: "Donut" },
  ]

  for (const { testId, name } of legendTestCases) {
    test(`${name} streaming renders a legend`, async ({ page }) => {
      await waitForStreaming(page, testId)

      const testCase = page.locator(`[data-testid="${testId}"]`)
      // Legend renders as SVG overlay with legend items
      const legendItems = testCase.locator('[role="option"], .legend-item, text')
      const count = await legendItems.count()

      // Should have at least 2 legend items
      expect(count).toBeGreaterThanOrEqual(2)
    })
  }
})

// ─── Tooltip regression tests ────────────────────────────────────────────────

test.describe("Area Chart Tooltip Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/streaming-regression-examples/")
  })

  test("area chart tooltip shows field values, not dashes", async ({ page }) => {
    await waitForStreaming(page, "regression-area-tooltip", 1000)

    const testCase = page.locator('[data-testid="regression-area-tooltip"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()

    if (box) {
      // Hover near the center of the chart where area data should be
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(500)

      // Check if a tooltip appeared with actual values
      const tooltip = testCase.locator(".semiotic-tooltip, [class*='tooltip']")
      const tooltipCount = await tooltip.count()

      if (tooltipCount > 0) {
        const tooltipText = await tooltip.first().textContent()
        // Should NOT contain only dashes
        expect(tooltipText).not.toMatch(/^[\s\-–—]*$/)
        // Should contain some numeric value
        expect(tooltipText).toMatch(/\d/)
      }
    }
  })
})

// ─── LineChart infinite loop regression ──────────────────────────────────────

test.describe("LineChart Streaming Stability", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/streaming-regression-examples/")
  })

  test("LineChart streaming does not trigger infinite re-render loop", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await waitForStreaming(page, "regression-line-streaming", 3000)

    // Should have no "Maximum update depth exceeded" errors
    const loopErrors = errors.filter((e) => e.includes("Maximum update depth"))
    expect(loopErrors).toHaveLength(0)

    // The chart should still be alive (canvas visible, no error indicator)
    const testCase = page.locator('[data-testid="regression-line-streaming"]')
    const errorIndicator = testCase.locator(".error-indicator")
    expect(await errorIndicator.count()).toBe(0)

    const canvas = testCase.locator("canvas").first()
    await expect(canvas).toBeVisible()
  })
})

// ─── Force-directed graph centering regression ───────────────────────────────

test.describe("Force Graph Centering Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/streaming-regression-examples/")
  })

  test("force-directed graph nodes are centered in the canvas", async ({ page }) => {
    // Give the force simulation time to settle
    await waitForStreaming(page, "regression-force-centering", 4000)

    const centered = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="regression-force-centering"]')
      if (!container) return false
      const canvas = container.querySelector("canvas")
      if (!canvas) return false
      const ctx = canvas.getContext("2d")
      if (!ctx) return false

      const w = canvas.width
      const h = canvas.height
      const data = ctx.getImageData(0, 0, w, h).data

      // Find the bounding box of non-background pixels
      let minX = w, maxX = 0, minY = h, maxY = 0
      let foundPixels = false
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 50) continue
          if (r > 240 && g > 240 && b > 240) continue
          foundPixels = true
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }

      if (!foundPixels) return false

      // Check that the centroid of drawn content is roughly centered
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const canvasCenterX = w / 2
      const canvasCenterY = h / 2

      // Allow 30% tolerance
      const xOk = Math.abs(centerX - canvasCenterX) < w * 0.3
      const yOk = Math.abs(centerY - canvasCenterY) < h * 0.3

      return xOk && yOk
    })

    expect(centered).toBe(true)
  })
})

// ─── No JS errors during streaming ───────────────────────────────────────────

test.describe("Streaming Error-Free Regression", () => {
  test("all streaming regression examples render without JS errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/streaming-regression-examples/")
    // Wait for all charts to push data and render
    await page.waitForTimeout(5000)

    // Filter out known benign warnings
    const realErrors = errors.filter(
      (e) =>
        !e.includes("act(") &&
        !e.includes("Warning:") &&
        !e.includes("React does not recognize")
    )

    expect(realErrors).toHaveLength(0)
  })

  test("all streaming charts have visible canvases", async ({ page }) => {
    await page.goto("/streaming-regression-examples/")
    await page.waitForTimeout(3000)

    const testIds = [
      "regression-stacked-bar",
      "regression-pie",
      "regression-bubble",
      "regression-grouped-bar",
      "regression-stacked-area",
      "regression-area-tooltip",
      "regression-line-streaming",
      "regression-force-centering",
      "regression-chord-streaming",
      "regression-donut",
      "regression-scatter",
    ]

    for (const testId of testIds) {
      const testCase = page.locator(`[data-testid="${testId}"]`)
      await expect(testCase).toBeVisible()
      const canvas = testCase.locator("canvas").first()
      await expect(canvas).toBeVisible({ timeout: 8000 })
    }
  })
})
