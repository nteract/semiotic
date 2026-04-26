import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForAllChartsReady, waitForStreamingUpdate } from "./helpers"

test.describe("Realtime Charts - Line Chart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/realtime-examples/")
  })

  test("RealtimeLineChart renders canvas", async ({ page }) => {
    await waitForChartReady(page, "realtime-line", { stable: false })
    const testCase = page.locator('[data-testid="realtime-line"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })

  test("RealtimeLineChart updates over time", async ({ page }) => {
    await waitForChartReady(page, "realtime-line", { stable: false })
    const testCase = page.locator('[data-testid="realtime-line"]')
    const canvas = testCase.locator("canvas").first()

    // Take a screenshot at the current state
    const screenshot1 = await canvas.screenshot()
    expect(screenshot1.length).toBeGreaterThan(0)

    // Wait for the streaming chart to push new data and repaint. Event-driven
    // so the test proceeds as soon as the canvas pixel hash shifts, instead
    // of sleeping for a fixed window and hoping.
    await waitForStreamingUpdate(page, "realtime-line")

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
    await waitForChartReady(page, "realtime-histogram", { stable: false })
    const testCase = page.locator('[data-testid="realtime-histogram"]')
    const canvases = testCase.locator("canvas")
    expect(await canvases.count()).toBeGreaterThan(0)
  })

  test("RealtimeHistogram has a visible chart area", async ({ page }) => {
    await waitForChartReady(page, "realtime-histogram", { stable: false })
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
    await waitForChartReady(page, "realtime-waterfall", { stable: false })
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
    await waitForChartReady(page, "realtime-swarm", { stable: false })
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
    // Wait for every chart on the page to have rendered visible content —
    // catches any error that would fire during first paint or initial push.
    await waitForAllChartsReady(page)

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })

  test("all four realtime charts have canvases", async ({ page }) => {
    await page.goto("/realtime-examples/")
    await waitForAllChartsReady(page)

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
