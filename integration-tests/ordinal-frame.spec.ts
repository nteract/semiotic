import { test, expect, Page } from "@playwright/test"

// Helper function to wait for canvas-based visualization to render
async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(500)
}

test.describe("Ordinal Charts - Bar Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders vertical bar chart", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-vertical")
    const testCase = page.locator('[data-testid="ordinal-bars-vertical"]')
    await expect(testCase).toHaveScreenshot("ordinal-bars-vertical.png", {
      maxDiffPixels: 100
    })
  })

  test("renders horizontal bar chart", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-horizontal")
    const testCase = page.locator('[data-testid="ordinal-bars-horizontal"]')
    await expect(testCase).toHaveScreenshot("ordinal-bars-horizontal.png", {
      maxDiffPixels: 100
    })
  })

  test("renders stacked bar chart", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-stacked")
    const testCase = page.locator('[data-testid="ordinal-bars-stacked"]')
    await expect(testCase).toHaveScreenshot("ordinal-bars-stacked.png", {
      maxDiffPixels: 100
    })
  })

  test("renders grouped bar chart", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-grouped")
    const testCase = page.locator('[data-testid="ordinal-bars-grouped"]')
    await expect(testCase).toHaveScreenshot("ordinal-bars-grouped.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("Ordinal Charts - Pie and Donut", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders pie chart", async ({ page }) => {
    await waitForVisualization(page, "ordinal-pie")
    const testCase = page.locator('[data-testid="ordinal-pie"]')
    await expect(testCase).toHaveScreenshot("ordinal-pie.png", {
      maxDiffPixels: 100
    })
  })

  test("renders donut chart", async ({ page }) => {
    await waitForVisualization(page, "ordinal-donut")
    const testCase = page.locator('[data-testid="ordinal-donut"]')
    await expect(testCase).toHaveScreenshot("ordinal-donut.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("Ordinal Charts - Statistical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders swarm plot", async ({ page }) => {
    await waitForVisualization(page, "ordinal-swarm")
    const testCase = page.locator('[data-testid="ordinal-swarm"]')
    await expect(testCase).toHaveScreenshot("ordinal-swarm.png", {
      maxDiffPixels: 100
    })
  })

  test("renders box plot", async ({ page }) => {
    await waitForVisualization(page, "ordinal-boxplot")
    const testCase = page.locator('[data-testid="ordinal-boxplot"]')
    await expect(testCase).toHaveScreenshot("ordinal-boxplot.png", {
      maxDiffPixels: 100
    })
  })

  test("renders violin plot", async ({ page }) => {
    await waitForVisualization(page, "ordinal-violin")
    const testCase = page.locator('[data-testid="ordinal-violin"]')
    await expect(testCase).toHaveScreenshot("ordinal-violin.png", {
      maxDiffPixels: 100
    })
  })

  test("renders histogram", async ({ page }) => {
    await waitForVisualization(page, "ordinal-histogram")
    const testCase = page.locator('[data-testid="ordinal-histogram"]')
    await expect(testCase).toHaveScreenshot("ordinal-histogram.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("Ordinal Charts - Interactivity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("shows tooltip on bar hover", async ({ page }) => {
    await waitForVisualization(page, "ordinal-bars-hover")

    const testCase = page.locator('[data-testid="ordinal-bars-hover"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover near the center of the chart where bars should be
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(300)

      await expect(testCase).toHaveScreenshot("ordinal-bars-hover-state.png", {
        maxDiffPixels: 150
      })
    }
  })
})

test.describe("Ordinal Charts - Swimlane", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("swimlane renders canvas data marks", async ({ page }) => {
    await waitForVisualization(page, "ord-swimlane")
    const testCase = page.locator('[data-testid="ord-swimlane"]')
    const canvas = testCase.locator("canvas").first()
    // Canvas should have non-zero dimensions
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)

    // Should have category tick labels A, B, C
    const texts = await testCase.locator("svg text").allTextContents()
    console.log("Swimlane WITH labels:", texts)
    expect(texts).toContain("A")
    expect(texts).toContain("B")
    expect(texts).toContain("C")
  })

  test("swimlane with showCategoryTicks=false renders data but no lane labels", async ({ page }) => {
    await waitForVisualization(page, "ord-swimlane-no-ticks")
    const testCase = page.locator('[data-testid="ord-swimlane-no-ticks"]')
    const canvas = testCase.locator("canvas").first()
    // Canvas should still render data marks
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)

    // Should NOT have category tick labels A, B, C
    const texts = await testCase.locator("svg text").allTextContents()
    console.log("Swimlane NO labels:", texts)
    expect(texts).not.toContain("A")
    expect(texts).not.toContain("B")
    expect(texts).not.toContain("C")
  })
})
