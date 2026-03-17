import { test, expect, Page } from "@playwright/test"

// Helper function to wait for canvas-based visualization to render
async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(500)
}

test.describe("Brush & Selection - Coordinated hover", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  test("linked hover dashboard renders multiple chart canvases", async ({ page }) => {
    await waitForVisualization(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // Each chart should have at least 1 canvas (data + interaction layer)
    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test("hovering over scatter chart does not crash linked charts", async ({ page }) => {
    await waitForVisualization(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover across the chart area
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25)
      await page.waitForTimeout(200)
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
      await page.waitForTimeout(200)
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75)
      await page.waitForTimeout(200)

      // All canvases should still be visible (no crash from linked updates)
      const canvases = testCase.locator("canvas")
      const count = await canvases.count()
      expect(count).toBeGreaterThanOrEqual(2)
    }
  })

  test("moving mouse off chart clears hover state without error", async ({ page }) => {
    await waitForVisualization(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover into chart
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(300)

      // Move mouse completely away from the chart
      await page.mouse.move(0, 0)
      await page.waitForTimeout(300)

      // Chart should still be rendered
      await expect(canvas).toBeVisible()
    }
  })
})

test.describe("Brush & Selection - Three-way linked charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  test("three-way linked charts all render canvases", async ({ page }) => {
    await waitForVisualization(page, "three-way-linked")
    const testCase = page.locator('[data-testid="three-way-linked"]')

    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    // 3 charts, each with at least 1 canvas
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test("hover propagation across three linked charts", async ({ page }) => {
    await waitForVisualization(page, "three-way-linked")
    const testCase = page.locator('[data-testid="three-way-linked"]')

    // Find the first chart canvas and hover it
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(500)

      // All charts should still be rendered (no crash from selection propagation)
      const canvases = testCase.locator("canvas")
      const count = await canvases.count()
      expect(count).toBeGreaterThanOrEqual(3)
    }
  })
})

test.describe("Brush & Selection - Legend interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  test("unified legend renders in linked hover dashboard", async ({ page }) => {
    await waitForVisualization(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // CategoryColorProvider + LinkedCharts should produce a unified legend
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test("clicking legend item does not crash chart", async ({ page }) => {
    await waitForVisualization(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    const legendItems = testCase.locator(".legend-item g")
    const count = await legendItems.count()

    if (count > 0) {
      // Click the first legend item
      await legendItems.first().click()
      await page.waitForTimeout(500)

      // Charts should still render
      const canvases = testCase.locator("canvas")
      expect(await canvases.count()).toBeGreaterThanOrEqual(2)
    }
  })
})

test.describe("Brush & Selection - Accessibility examples coordinated views", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("coordinated views in accessibility page render both charts", async ({ page }) => {
    await waitForVisualization(page, "a11y-coordinated")
    const testCase = page.locator('[data-testid="a11y-coordinated"]')

    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test("hover on coordinated scatter does not crash", async ({ page }) => {
    await waitForVisualization(page, "a11y-coordinated")
    const testCase = page.locator('[data-testid="a11y-coordinated"]')

    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Sweep across the canvas
      for (let i = 0; i < 5; i++) {
        const frac = (i + 1) / 6
        await page.mouse.move(
          box.x + box.width * frac,
          box.y + box.height * frac
        )
        await page.waitForTimeout(100)
      }

      // Chart should still be intact
      await expect(canvas).toBeVisible()
    }
  })
})

test.describe("Brush & Selection - Empty state", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  test("empty state shows placeholder, not canvas", async ({ page }) => {
    const testCase = page.locator('[data-testid="empty-state"]')
    await expect(testCase).toBeVisible()

    // Should NOT have a canvas when data is empty
    const canvases = testCase.locator("canvas")
    const canvasCount = await canvases.count()
    expect(canvasCount).toBe(0)

    // Should show "No data available" text
    await expect(testCase).toContainText("No data available")
  })
})

test.describe("Brush & Selection - No console errors", () => {
  test("coordinated interaction produces no JS errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/coordinated-examples/")
    await page.waitForTimeout(3000)

    // Trigger some interactions
    const canvases = page.locator("canvas")
    const count = await canvases.count()
    if (count > 0) {
      const box = await canvases.first().boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(300)
        await page.mouse.move(0, 0)
        await page.waitForTimeout(300)
      }
    }

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })
})
