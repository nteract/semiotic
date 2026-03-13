import { test, expect, Page } from "@playwright/test"

async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  // Wait for at least one canvas to render
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(500)
}

test.describe("Coordinated Views", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  // ── Linked hover cross-highlighting ───────────────────────────────────

  test("linked hover dashboard renders both charts", async ({ page }) => {
    await waitForVisualization(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // Should have 2 canvas elements (scatter + bar)
    const canvases = testCase.locator("canvas")
    await expect(canvases).toHaveCount(2, { timeout: 5000 })
  })

  test("linked hover dashboard shows unified legend", async ({ page }) => {
    await waitForVisualization(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // CategoryColorProvider + LinkedCharts should produce a unified legend
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test("hover on scatter chart shows tooltip", async ({ page }) => {
    await waitForVisualization(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // Find the first canvas (scatter) and hover its center
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(500)
    }

    // Screenshot captures hover state
    await expect(testCase).toHaveScreenshot("linked-hover-state.png", {
      maxDiffPixels: 200,
    })
  })

  // ── ChartGrid with emphasis ───────────────────────────────────────────

  test("grid emphasis renders primary chart spanning 2 columns", async ({ page }) => {
    await waitForVisualization(page, "grid-emphasis")
    const testCase = page.locator('[data-testid="grid-emphasis"]')

    // The grid should have a child div with gridColumn: span 2
    const spanDiv = testCase.locator('div[style*="grid-column: span 2"]')
    const count = await spanDiv.count()
    expect(count).toBe(1)
  })

  test("grid emphasis renders all 3 charts", async ({ page }) => {
    await waitForVisualization(page, "grid-emphasis")
    const testCase = page.locator('[data-testid="grid-emphasis"]')

    // Should have 3 canvas elements
    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBe(3)
  })

  // ── Empty state ───────────────────────────────────────────────────────

  test("empty state shows placeholder instead of canvas", async ({ page }) => {
    const testCase = page.locator('[data-testid="empty-state"]')
    await expect(testCase).toBeVisible()

    // Should NOT have a canvas
    const canvases = testCase.locator("canvas")
    const canvasCount = await canvases.count()
    expect(canvasCount).toBe(0)

    // Should show "No data available" text
    await expect(testCase).toContainText("No data available")
  })

  // ── Three-way linked charts ───────────────────────────────────────────

  test("three-way linked dashboard renders all 3 charts", async ({ page }) => {
    await waitForVisualization(page, "three-way-linked")
    const testCase = page.locator('[data-testid="three-way-linked"]')

    // Should have 3 canvas elements
    const canvases = testCase.locator("canvas")
    await expect(canvases).toHaveCount(3, { timeout: 5000 })
  })

  test("three-way linked dashboard has no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/coordinated-examples/")
    await page.waitForTimeout(3000)

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })
})
