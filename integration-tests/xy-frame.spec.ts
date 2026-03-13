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
