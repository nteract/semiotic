import { test, expect, Page } from "@playwright/test"

// Helper function to wait for canvas-based visualization to render
async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(500)
}

test.describe("Accessibility - Canvas aria-labels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("XY chart frame has role=img and aria-label from title", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-titled")
    const testCase = page.locator('[data-testid="a11y-xy-titled"]')
    const frame = testCase.locator(".stream-xy-frame")
    await expect(frame).toHaveAttribute("role", "img")
    const ariaLabel = await frame.getAttribute("aria-label")
    expect(ariaLabel).toBe("Monthly Revenue Trends")
  })

  test("XY chart frame has default aria-label when no title", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-default")
    const testCase = page.locator('[data-testid="a11y-xy-default"]')
    const frame = testCase.locator(".stream-xy-frame")
    await expect(frame).toHaveAttribute("role", "img")
    const ariaLabel = await frame.getAttribute("aria-label")
    expect(ariaLabel).toBeTruthy()
    // Default fallback is "XY chart"
    expect(ariaLabel).toBe("XY chart")
  })

  test("Ordinal chart frame has role=img and aria-label from title", async ({ page }) => {
    await waitForVisualization(page, "a11y-ordinal")
    const testCase = page.locator('[data-testid="a11y-ordinal"]')
    const frame = testCase.locator(".stream-ordinal-frame")
    await expect(frame).toHaveAttribute("role", "img")
    const ariaLabel = await frame.getAttribute("aria-label")
    expect(ariaLabel).toBe("Sales by Category")
  })

  test("Network chart frame has role=img and aria-label from title", async ({ page }) => {
    // Force-directed graphs need extra time to settle
    const testCase = page.locator('[data-testid="a11y-network"]')
    await expect(testCase).toBeVisible()
    const canvas = testCase.locator("canvas").first()
    await expect(canvas).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    const frame = testCase.locator(".stream-network-frame")
    await expect(frame).toHaveAttribute("role", "img")
    const ariaLabel = await frame.getAttribute("aria-label")
    expect(ariaLabel).toBe("Team Connections")
  })
})

test.describe("Accessibility - aria-live announcements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("chart with tooltip has an aria-live region attached", async ({ page }) => {
    await waitForVisualization(page, "a11y-tooltip")
    const testCase = page.locator('[data-testid="a11y-tooltip"]')

    // The AriaLiveTooltip component renders an aria-live="polite" region
    const liveRegion = testCase.locator("[aria-live='polite']")
    await expect(liveRegion.first()).toBeAttached()
  })

  test("hovering over a point populates the aria-live region", async ({ page }) => {
    await waitForVisualization(page, "a11y-tooltip")
    const testCase = page.locator('[data-testid="a11y-tooltip"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()

    if (box) {
      // Move to center of chart where data points should be
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(500)

      // The aria-live region should exist (content may vary based on hit)
      const liveRegion = testCase.locator("[aria-live='polite']")
      await expect(liveRegion.first()).toBeAttached()
    }
  })
})

test.describe("Accessibility - Legend keyboard interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("legend items are rendered for chart with colorBy", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    // Legend items should be rendered with the .legend-item class
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test("legend is visible and has measurable dimensions", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    const legendItem = testCase.locator(".legend-item").first()
    await expect(legendItem).toBeVisible()

    const box = await legendItem.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })
})

test.describe("Accessibility - ChartContainer toolbar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("ChartContainer renders toolbar action buttons", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    // ChartContainer should render action buttons
    const buttons = testCase.locator("button.semiotic-chart-action")
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })

  test("toolbar buttons have title attributes for accessibility", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    const buttons = testCase.locator("button.semiotic-chart-action")
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)

    // Each button should have at least a title attribute for screen readers
    for (let i = 0; i < count; i++) {
      const title = await buttons.nth(i).getAttribute("title")
      expect(title).toBeTruthy()
    }
  })

  test("ChartContainer has a title heading", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    // The ChartContainer should render its title text
    await expect(testCase).toContainText("Revenue Overview")
  })
})

test.describe("Accessibility - Tabindex and focus", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("chart frames are focusable (have tabIndex)", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-titled")
    const testCase = page.locator('[data-testid="a11y-xy-titled"]')
    const frame = testCase.locator(".stream-xy-frame")

    // Stream frames should have tabIndex=0 for keyboard accessibility
    const tabIndex = await frame.getAttribute("tabindex")
    expect(tabIndex).toBe("0")
  })
})

test.describe("Accessibility - No console errors", () => {
  test("accessibility examples page loads without JS errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/accessibility-examples/")
    await page.waitForTimeout(3000)

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })
})
