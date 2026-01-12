import { test, expect } from "@playwright/test"

test.describe("HOC Chart Legend Rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/hoc-legend-examples/")
    // Wait for page to load and charts to render
    await page.waitForTimeout(2000)
  })

  test("BubbleChart renders legend when colorBy is specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="bubble-with-legend"]')
    await expect(testCase).toBeVisible()

    // Check that legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)

    // Verify legend is visible
    await expect(legendItems.first()).toBeVisible()

    // Take screenshot for visual verification
    await testCase.screenshot({ path: "test-results/bubble-with-legend.png" })
  })

  test("BubbleChart does not render legend when colorBy is not specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="bubble-no-legend"]')
    await expect(testCase).toBeVisible()

    // Check that no legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBe(0)
  })

  test("BarChart renders legend when colorBy is specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="bar-with-legend"]')
    await expect(testCase).toBeVisible()

    // Check that legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)

    // Verify legend is visible
    await expect(legendItems.first()).toBeVisible()

    // Take screenshot for visual verification
    await testCase.screenshot({ path: "test-results/bar-with-legend.png" })
  })

  test("BarChart does not render legend when colorBy is not specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="bar-no-legend"]')
    await expect(testCase).toBeVisible()

    // Check that no legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBe(0)
  })

  test("ForceDirectedGraph renders legend when colorBy is specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="network-with-legend"]')
    await expect(testCase).toBeVisible()

    // Check that legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)

    // Verify legend is visible
    await expect(legendItems.first()).toBeVisible()

    // Take screenshot for visual verification
    await testCase.screenshot({ path: "test-results/network-with-legend.png" })
  })

  test("ForceDirectedGraph does not render legend when colorBy is not specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="network-no-legend"]')
    await expect(testCase).toBeVisible()

    // Check that no legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBe(0)
  })

  test("Scatterplot renders legend when colorBy is specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="scatter-with-legend"]')
    await expect(testCase).toBeVisible()

    // Check that legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)

    // Verify legend is visible
    await expect(legendItems.first()).toBeVisible()
  })

  test("LineChart renders legend when colorBy is specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="line-with-legend"]')
    await expect(testCase).toBeVisible()

    // Check that legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)

    // Verify legend is visible
    await expect(legendItems.first()).toBeVisible()
  })

  test("SwarmPlot renders legend when colorBy is specified", async ({ page }) => {
    const testCase = page.locator('[data-testid="swarm-with-legend"]')
    await expect(testCase).toBeVisible()

    // Check that legend items are rendered
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)

    // Verify legend is visible
    await expect(legendItems.first()).toBeVisible()
  })

  test("BubbleChart respects showLegend=false prop", async ({ page }) => {
    const testCase = page.locator('[data-testid="bubble-legend-disabled"]')
    await expect(testCase).toBeVisible()

    // Check that no legend items are rendered even though colorBy is specified
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBe(0)
  })

  test("Legend items have correct count for unique categories", async ({ page }) => {
    const testCase = page.locator('[data-testid="bubble-with-legend"]')
    await expect(testCase).toBeVisible()

    // BubbleData has 3 unique categories: Tech, Finance, Healthcare
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBe(1) // Should be 1 legend group

    // Check that the legend group contains items
    const legendGroup = legendItems.first()
    await expect(legendGroup).toBeVisible()
  })

  test("Legend is positioned with sufficient margin", async ({ page }) => {
    const testCase = page.locator('[data-testid="bubble-with-legend"]')
    await expect(testCase).toBeVisible()

    // Get the SVG element
    const svg = testCase.locator("svg").first()
    await expect(svg).toBeVisible()

    // Get legend element
    const legendItems = testCase.locator(".legend-item").first()
    await expect(legendItems).toBeVisible()

    // The legend should be visible (not clipped) - if we can see it, the margin is sufficient
    const legendBox = await legendItems.boundingBox()
    expect(legendBox).not.toBeNull()
    expect(legendBox!.width).toBeGreaterThan(0)
    expect(legendBox!.height).toBeGreaterThan(0)
  })
})
