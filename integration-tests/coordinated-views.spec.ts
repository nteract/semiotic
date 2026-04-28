import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForAllChartsReady, waitForRafs } from "./helpers"

test.describe("Coordinated Views", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  // ── Linked hover cross-highlighting ───────────────────────────────────

  test("linked hover dashboard renders both charts", async ({ page }) => {
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // Each chart renders at least 1 canvas; some have a separate interaction canvas
    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test("linked hover dashboard shows unified legend", async ({ page }) => {
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // CategoryColorProvider + LinkedCharts should produce a unified legend
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test("hover on scatter chart triggers interaction", async ({ page }) => {
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // Find the first canvas (scatter data canvas) and hover its center
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await waitForRafs(page)

      // Hover over a populated scatter should surface a tooltip (the
      // interaction-canvas hit test resolved a point and the
      // FlippingTooltip wrapper rendered into the DOM). The tooltip's
      // existence after hover IS the load-bearing assertion — checking
      // count=1 (rather than visibility) makes the semantic claim
      // explicit: hover wired up, hit-tester resolved a point, and the
      // tooltip mounted as a result.
      const tooltip = testCase.locator(".stream-frame-tooltip")
      await expect(tooltip).toHaveCount(1, { timeout: 2000 })
    }
  })

  // ── ChartGrid with emphasis ───────────────────────────────────────────

  test("grid emphasis renders primary chart spanning 2 columns", async ({ page }) => {
    await waitForChartReady(page, "grid-emphasis")
    const testCase = page.locator('[data-testid="grid-emphasis"]')

    // The grid should have a child div with gridColumn: span 2
    // WebKit may serialize the style differently, so check multiple patterns
    const spanDiv = testCase.locator('div[style*="grid-column: span 2"], div[style*="grid-column:span 2"], div[style*="grid-column-start: span 2"]')
    const count = await spanDiv.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test("grid emphasis renders all 3 charts", async ({ page }) => {
    await waitForChartReady(page, "grid-emphasis")
    const testCase = page.locator('[data-testid="grid-emphasis"]')

    // Each chart renders at least 1 canvas; some have a separate interaction canvas
    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(3)
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
    await waitForChartReady(page, "three-way-linked")
    const testCase = page.locator('[data-testid="three-way-linked"]')

    // Each chart renders at least 1 canvas; some have a separate interaction canvas
    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test("three-way linked dashboard has no console errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/coordinated-examples/")
    await waitForAllChartsReady(page)

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })
})
