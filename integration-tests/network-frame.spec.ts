import { test, expect, Page } from "@playwright/test"

// Helper function to wait for canvas-based visualization to render
async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  const canvas = testCase.locator("canvas")
  await expect(canvas).toBeVisible({ timeout: 10000 })
  // Network layouts (especially force-directed) need more time to settle
  await page.waitForTimeout(2000)
}

test.describe("Network Charts - Force-Directed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders force-directed graph", async ({ page }) => {
    await waitForVisualization(page, "network-force")
    const testCase = page.locator('[data-testid="network-force"]')
    await expect(testCase).toHaveScreenshot("network-force.png", {
      maxDiffPixels: 200 // Force layouts can have slight variations
    })
  })

  test("shows tooltip on force graph hover", async ({ page }) => {
    await waitForVisualization(page, "network-force-hover")

    const testCase = page.locator('[data-testid="network-force-hover"]')
    const canvas = testCase.locator("canvas")
    const box = await canvas.boundingBox()
    if (box) {
      // Hover near the center of the chart where nodes cluster
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(300)

      await expect(testCase).toHaveScreenshot(
        "network-force-hover-state.png",
        { maxDiffPixels: 200 }
      )
    }
  })
})

test.describe("Network Charts - Hierarchical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders tree diagram", async ({ page }) => {
    await waitForVisualization(page, "network-tree")
    const testCase = page.locator('[data-testid="network-tree"]')
    await expect(testCase).toHaveScreenshot("network-tree.png", {
      maxDiffPixels: 100
    })
  })

  test("renders treemap", async ({ page }) => {
    await waitForVisualization(page, "network-treemap")
    const testCase = page.locator('[data-testid="network-treemap"]')
    await expect(testCase).toHaveScreenshot("network-treemap.png", {
      maxDiffPixels: 100
    })
  })

  test("renders circle pack", async ({ page }) => {
    await waitForVisualization(page, "network-circlepack")
    const testCase = page.locator('[data-testid="network-circlepack"]')
    await expect(testCase).toHaveScreenshot("network-circlepack.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("Network Charts - Flow Layouts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders sankey diagram", async ({ page }) => {
    await waitForVisualization(page, "network-sankey")
    const testCase = page.locator('[data-testid="network-sankey"]')
    await expect(testCase).toHaveScreenshot("network-sankey.png", {
      maxDiffPixels: 100
    })
  })

  test("renders chord diagram", async ({ page }) => {
    await waitForVisualization(page, "network-chord")
    const testCase = page.locator('[data-testid="network-chord"]')
    await expect(testCase).toHaveScreenshot("network-chord.png", {
      maxDiffPixels: 100
    })
  })
})
