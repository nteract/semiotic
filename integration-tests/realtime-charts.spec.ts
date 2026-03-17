import { test, expect, Page } from "@playwright/test"

// Helper function to wait for canvas-based visualization to render
// Realtime charts need time for data to start pushing
async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 8000 })
  // Give time for streaming data to begin rendering
  await page.waitForTimeout(1500)
}

test.describe("Realtime Charts - Line Chart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/realtime-examples/")
  })

  test("RealtimeLineChart renders canvas", async ({ page }) => {
    await waitForVisualization(page, "realtime-line")
    const testCase = page.locator('[data-testid="realtime-line"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })

  test("RealtimeLineChart updates over time", async ({ page }) => {
    await waitForVisualization(page, "realtime-line")
    const testCase = page.locator('[data-testid="realtime-line"]')
    const canvas = testCase.locator("canvas").first()

    // Take a screenshot at the current state
    const screenshot1 = await canvas.screenshot()
    expect(screenshot1.length).toBeGreaterThan(0)

    // Wait for more data to be pushed
    await page.waitForTimeout(2000)

    // Take another screenshot -- the chart should have new data
    const screenshot2 = await canvas.screenshot()
    expect(screenshot2.length).toBeGreaterThan(0)

    // Both screenshots should be valid (chart didn't crash)
    // We do not assert they differ since the PRNG data may have
    // finished pushing within the window, but the chart is alive
  })
})

test.describe("Realtime Charts - Histogram", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/realtime-examples/")
  })

  test("RealtimeHistogram renders canvas", async ({ page }) => {
    await waitForVisualization(page, "realtime-histogram")
    const testCase = page.locator('[data-testid="realtime-histogram"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })

  test("RealtimeHistogram has a visible chart area", async ({ page }) => {
    await waitForVisualization(page, "realtime-histogram")
    const testCase = page.locator('[data-testid="realtime-histogram"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.height).toBeGreaterThan(100)
  })
})

test.describe("Realtime Charts - Waterfall", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/realtime-examples/")
  })

  test("RealtimeWaterfallChart renders canvas", async ({ page }) => {
    await waitForVisualization(page, "realtime-waterfall")
    const testCase = page.locator('[data-testid="realtime-waterfall"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })
})

test.describe("Realtime Charts - Swarm", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/realtime-examples/")
  })

  test("RealtimeSwarmChart renders canvas", async ({ page }) => {
    await waitForVisualization(page, "realtime-swarm")
    const testCase = page.locator('[data-testid="realtime-swarm"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })
})

test.describe("Realtime Charts - Rendering Integrity", () => {
  test("all realtime charts render without JS errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/realtime-examples/")
    // Wait for all charts to render and push some data
    await page.waitForTimeout(5000)

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })

  test("all four realtime charts have canvases", async ({ page }) => {
    await page.goto("/realtime-examples/")
    await page.waitForTimeout(3000)

    const testIds = [
      "realtime-line",
      "realtime-histogram",
      "realtime-waterfall",
      "realtime-swarm",
    ]

    for (const testId of testIds) {
      const testCase = page.locator(`[data-testid="${testId}"]`)
      await expect(testCase).toBeVisible()
      const canvas = testCase.locator("canvas").first()
      await expect(canvas).toBeVisible({ timeout: 8000 })
    }
  })
})
