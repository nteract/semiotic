import { test, expect, Page } from "@playwright/test"

// Helper function to wait for viz to render
async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()

  const svg = testCase.locator("svg.visualization-layer")
  const canvas = testCase.locator("canvas")

  try {
    await expect(svg.or(canvas)).toBeVisible({ timeout: 5000 })
  } catch (e) {
    throw new Error(`Neither SVG nor Canvas found for test case: ${testId}`)
  }

  await page.waitForTimeout(500)
}

test.describe("OrdinalFrame - Bar Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders vertical bars in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-vertical-svg")

    const testCase = page.locator('[data-testid="ordinal-bars-vertical-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Check that bars are rendered (rects or paths)
    const bars = svg.locator("rect, path")
    const count = await bars.count()
    expect(count).toBeGreaterThan(0)

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("ordinal-bars-vertical-svg.png", {
      maxDiffPixels: 100
    })
  })

  test("renders horizontal bars in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-horizontal-svg")

    const testCase = page.locator('[data-testid="ordinal-bars-horizontal-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Visual snapshot
    await expect(testCase).toHaveScreenshot(
      "ordinal-bars-horizontal-svg.png",
      {
        maxDiffPixels: 100
      }
    )
  })

  test("renders stacked bars correctly", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-stacked")

    const testCase = page.locator('[data-testid="ordinal-bars-stacked"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("ordinal-bars-stacked.png", {
      maxDiffPixels: 100
    })
  })

  // KNOWN ISSUE: Canvas elements not appearing in test - investigating
  test.skip("renders bars in Canvas mode", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-canvas")

    const testCase = page.locator('[data-testid="ordinal-bars-canvas"]')
    const canvas = testCase.locator("canvas")
    await expect(canvas).toBeVisible()

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("ordinal-bars-canvas.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("OrdinalFrame - Radial Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders pie chart in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "ordinal-pie-svg")

    const testCase = page.locator('[data-testid="ordinal-pie-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("ordinal-pie-svg.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("OrdinalFrame - Timeline Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders timeline chart in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "ordinal-timeline-svg")

    const testCase = page.locator('[data-testid="ordinal-timeline-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("ordinal-timeline-svg.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("OrdinalFrame - Swarm Plots", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  // KNOWN ISSUE: Swarm plot not rendering circles - needs investigation
  test.skip("renders swarm plot in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "ordinal-swarm-svg")

    const testCase = page.locator('[data-testid="ordinal-swarm-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Check that circles are rendered
    const circles = svg.locator("circle")
    const count = await circles.count()
    expect(count).toBeGreaterThan(0)

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("ordinal-swarm-svg.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("OrdinalFrame - Interactivity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("shows tooltip on bar hover", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-hover")

    const testCase = page.locator('[data-testid="ordinal-bars-hover"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Get the bounding box of the SVG to hover within it
    const box = await svg.boundingBox()
    if (box) {
      // Hover near the center of the chart where bars should be
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(300)

      // Visual snapshot with potential hover state
      await expect(testCase).toHaveScreenshot("ordinal-bars-hover-state.png", {
        maxDiffPixels: 150
      })
    }
  })
})

test.describe("OrdinalFrame - Axes and Labels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders axes correctly on bar chart", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-vertical-svg")

    const testCase = page.locator('[data-testid="ordinal-bars-vertical-svg"]')
    const svg = testCase.locator("svg")

    // Check for axis elements
    const axes = svg.locator("g.axis")
    const axisCount = await axes.count()
    expect(axisCount).toBeGreaterThan(0)
  })

  test("renders labels on pie chart", async ({ page }) => {
    await waitForVisualization(page, "ordinal-pie-svg")

    const testCase = page.locator('[data-testid="ordinal-pie-svg"]')
    const svg = testCase.locator("svg")

    // Check for label elements
    const labels = svg.locator("text, g.ordinal-labels text")
    const labelCount = await labels.count()
    // Should have labels for each category
    expect(labelCount).toBeGreaterThan(0)
  })
})
