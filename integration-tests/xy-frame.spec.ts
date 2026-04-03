import { test, expect, Page } from "@playwright/test"

// Helper function to wait for canvas-based visualization to render
async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(500)
}

test.describe("XY Charts - Line Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders line chart", async ({ page }) => {
    await waitForVisualization(page, "xy-line")
    const testCase = page.locator('[data-testid="xy-line"]')
    await expect(testCase).toHaveScreenshot("xy-line.png", {
      maxDiffPixels: 100
    })
  })

  test("renders line chart with points", async ({ page }) => {
    await waitForVisualization(page, "xy-line-points")
    const testCase = page.locator('[data-testid="xy-line-points"]')
    await expect(testCase).toHaveScreenshot("xy-line-points.png", {
      maxDiffPixels: 100
    })
  })

  test("renders line chart with fill area", async ({ page }) => {
    await waitForVisualization(page, "xy-line-fill")
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
    await waitForVisualization(page, "xy-area")
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
    await waitForVisualization(page, "xy-scatter")
    const testCase = page.locator('[data-testid="xy-scatter"]')
    await expect(testCase).toHaveScreenshot("xy-scatter.png", {
      maxDiffPixels: 100
    })
  })

  test("renders bubble chart", async ({ page }) => {
    await waitForVisualization(page, "xy-bubble")
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
    await waitForVisualization(page, "xy-scatter-hover")

    const testCase = page.locator('[data-testid="xy-scatter-hover"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover near the center of the chart
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(300)

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
    await waitForVisualization(page, "xy-landmark-ticks")
    const testCase = page.locator('[data-testid="xy-landmark-ticks"]')

    // Get all text elements in the SVG overlay
    const texts = await testCase.locator("svg text").allTextContents()

    // Should have tick labels containing month names from the Jan-Mar 2024 data
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
    await waitForVisualization(page, "xy-auto-rotate")
    const testCase = page.locator('[data-testid="xy-auto-rotate"]')

    const texts = await testCase.locator("svg text").allTextContents()

    // X-axis labels should be long date strings
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
    await waitForVisualization(page, "xy-range-plot")
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
