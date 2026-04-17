import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForRafs } from "./helpers"

test.describe("XY Charts - Line Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders line chart", async ({ page }) => {
    await waitForChartReady(page, "xy-line")
    const testCase = page.locator('[data-testid="xy-line"]')
    await expect(testCase).toHaveScreenshot("xy-line.png", {
      maxDiffPixels: 100
    })
  })

  test("renders line chart with points", async ({ page }) => {
    await waitForChartReady(page, "xy-line-points")
    const testCase = page.locator('[data-testid="xy-line-points"]')
    await expect(testCase).toHaveScreenshot("xy-line-points.png", {
      maxDiffPixels: 100
    })
  })

  test("renders line chart with fill area", async ({ page }) => {
    await waitForChartReady(page, "xy-line-fill")
    const testCase = page.locator('[data-testid="xy-line-fill"]')
    await expect(testCase).toHaveScreenshot("xy-line-fill.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("XY Charts - Area Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders area chart", async ({ page }) => {
    await waitForChartReady(page, "xy-area")
    const testCase = page.locator('[data-testid="xy-area"]')
    await expect(testCase).toHaveScreenshot("xy-area.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("XY Charts - Scatter and Bubble", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders scatter plot", async ({ page }) => {
    await waitForChartReady(page, "xy-scatter")
    const testCase = page.locator('[data-testid="xy-scatter"]')
    await expect(testCase).toHaveScreenshot("xy-scatter.png", {
      maxDiffPixels: 100
    })
  })

  test("renders bubble chart", async ({ page }) => {
    await waitForChartReady(page, "xy-bubble")
    const testCase = page.locator('[data-testid="xy-bubble"]')
    await expect(testCase).toHaveScreenshot("xy-bubble.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("XY Charts - Interactivity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("shows tooltip on scatter hover", async ({ page }) => {
    await waitForChartReady(page, "xy-scatter-hover")

    const testCase = page.locator('[data-testid="xy-scatter-hover"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover near the center of the chart
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await waitForRafs(page)

      await expect(testCase).toHaveScreenshot("xy-scatter-hover-state.png", {
        maxDiffPixels: 150
      })
    }
  })
})

test.describe("XY Charts - Landmark Ticks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders date tick labels with landmark styling, not Dec 31", async ({ page }) => {
    await waitForChartReady(page, "xy-landmark-ticks")
    const testCase = page.locator('[data-testid="xy-landmark-ticks"]')

    // Axis labels are part of the SVG overlay, which lands in a separate
    // React commit after the canvas paints. Webkit in particular finishes
    // canvas painting before the first SVG text node is attached, so poll
    // until at least one Jan/Feb/Mar tick is in the DOM before sampling.
    await expect.poll(
      async () => (await testCase.locator("svg text").allTextContents())
        .filter(t => /Jan|Feb|Mar/.test(t)).length,
      { timeout: 5000 }
    ).toBeGreaterThan(2)

    const texts = await testCase.locator("svg text").allTextContents()
    const dateLabels = texts.filter(t => /Jan|Feb|Mar/.test(t))
    expect(dateLabels.length).toBeGreaterThan(2)

    // No labels should say "Dec 31" (which means scaleLinear was used instead of scaleTime)
    const dec31 = texts.filter(t => t.includes("Dec 31"))
    expect(dec31.length).toBe(0)

    // No labels should reference 1969/1970 (epoch fallback)
    const epoch = texts.filter(t => /196[89]|1970/.test(t))
    expect(epoch.length).toBe(0)
  })
})

test.describe("XY Charts - Auto-Rotate Labels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders distinct tick labels when autoRotate is set", async ({ page }) => {
    await waitForChartReady(page, "xy-auto-rotate")
    const testCase = page.locator('[data-testid="xy-auto-rotate"]')

    // Wait for the SVG overlay to paint its labels (separate React commit
    // from the canvas paint that `waitForChartReady` gates on).
    await expect.poll(
      async () => (await testCase.locator("svg text").allTextContents())
        .filter(t => /January|February|March/.test(t)).length,
      { timeout: 5000 }
    ).toBeGreaterThan(2)

    const texts = await testCase.locator("svg text").allTextContents()
    const dateLabels = texts.filter(t => /January|February|March/.test(t))
    expect(dateLabels.length).toBeGreaterThan(2)

    // All date labels must be DISTINCT — no duplicates
    const uniqueLabels = new Set(dateLabels)
    expect(uniqueLabels.size).toBe(dateLabels.length)
  })
})

test.describe("XY Charts - Range Plot", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders range/dumbbell plot with visible marks", async ({ page }) => {
    await waitForChartReady(page, "xy-range-plot")
    const testCase = page.locator('[data-testid="xy-range-plot"]')

    // Take a screenshot for visual verification
    await expect(testCase).toHaveScreenshot("xy-range-plot.png", {
      maxDiffPixels: 100
    })

    // The canvas should have non-trivial content (not blank)
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.height).toBeGreaterThan(100)

    // Check that axes rendered (SVG text elements)
    const texts = await testCase.locator("svg text").allTextContents()
    expect(texts.length).toBeGreaterThan(2)
  })
})
