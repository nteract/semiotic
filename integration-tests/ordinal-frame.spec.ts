import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForRafs } from "./helpers"

test.describe("Ordinal Charts - Bar Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders vertical bar chart", async ({ page }) => {
    await waitForChartReady(page, "ordinal-bars-vertical")
    const testCase = page.locator('[data-testid="ordinal-bars-vertical"]')
    await expect(testCase).toHaveScreenshot("ordinal-bars-vertical.png", {
      maxDiffPixels: 100
    })
  })

  test("renders horizontal bar chart", async ({ page }) => {
    await waitForChartReady(page, "ordinal-bars-horizontal")
    const testCase = page.locator('[data-testid="ordinal-bars-horizontal"]')
    await expect(testCase).toHaveScreenshot("ordinal-bars-horizontal.png", {
      maxDiffPixels: 100
    })
  })

  test("renders stacked bar chart", async ({ page }) => {
    await waitForChartReady(page, "ordinal-bars-stacked")
    const testCase = page.locator('[data-testid="ordinal-bars-stacked"]')
    await expect(testCase).toHaveScreenshot("ordinal-bars-stacked.png", {
      maxDiffPixels: 100
    })
  })

  test("renders grouped bar chart", async ({ page }) => {
    await waitForChartReady(page, "ordinal-bars-grouped")
    const testCase = page.locator('[data-testid="ordinal-bars-grouped"]')
    await expect(testCase).toHaveScreenshot("ordinal-bars-grouped.png", {
      maxDiffPixels: 100
    })
  })

  // BarChart's `valueExtent` prop maps to the frame's `rExtent`. Each
  // variant exercises one shape (both/min-only/max-only). Pinned to a
  // pixel-stable snapshot per browser so a regression that drops the
  // pass-through (or maps it to the wrong axis) shows up immediately.
  for (const variant of ["both", "min", "max"] as const) {
    test(`renders bar chart with valueExtent (${variant})`, async ({ page }) => {
      const id = `ordinal-bars-extent-${variant}`
      await waitForChartReady(page, id)
      const testCase = page.locator(`[data-testid="${id}"]`)
      await expect(testCase).toHaveScreenshot(`${id}.png`, { maxDiffPixels: 100 })
    })
  }
})

test.describe("Ordinal Charts - Pie and Donut", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("renders pie chart", async ({ page }) => {
    await waitForChartReady(page, "ordinal-pie")
    const testCase = page.locator('[data-testid="ordinal-pie"]')
    await expect(testCase).toHaveScreenshot("ordinal-pie.png", {
      maxDiffPixels: 100
    })
  })

  test("renders donut chart", async ({ page }) => {
    await waitForChartReady(page, "ordinal-donut")
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
    await waitForChartReady(page, "ordinal-swarm")
    const testCase = page.locator('[data-testid="ordinal-swarm"]')
    await expect(testCase).toHaveScreenshot("ordinal-swarm.png", {
      maxDiffPixels: 100
    })
  })

  test("renders box plot", async ({ page }) => {
    await waitForChartReady(page, "ordinal-boxplot")
    const testCase = page.locator('[data-testid="ordinal-boxplot"]')
    await expect(testCase).toHaveScreenshot("ordinal-boxplot.png", {
      maxDiffPixels: 100
    })
  })

  test("renders violin plot", async ({ page }) => {
    await waitForChartReady(page, "ordinal-violin")
    const testCase = page.locator('[data-testid="ordinal-violin"]')
    await expect(testCase).toHaveScreenshot("ordinal-violin.png", {
      maxDiffPixels: 100
    })
  })

  test("renders histogram", async ({ page }) => {
    await waitForChartReady(page, "ordinal-histogram")
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
    await waitForChartReady(page, "ordinal-bars-hover")

    const testCase = page.locator('[data-testid="ordinal-bars-hover"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover near the center of the chart where bars should be
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await waitForRafs(page)

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
    await waitForChartReady(page, "ord-swimlane")
    const testCase = page.locator('[data-testid="ord-swimlane"]')
    const canvas = testCase.locator("canvas").first()
    // Canvas should have non-zero dimensions
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)

    // Should have category tick labels A, B, C
    const texts = await testCase.locator("svg text").allTextContents()
    expect(texts).toContain("A")
    expect(texts).toContain("B")
    expect(texts).toContain("C")
  })

  test("swimlane with showCategoryTicks=false renders data but no lane labels", async ({ page }) => {
    await waitForChartReady(page, "ord-swimlane-no-ticks")
    const testCase = page.locator('[data-testid="ord-swimlane-no-ticks"]')
    const canvas = testCase.locator("canvas").first()
    // Canvas should still render data marks
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)

    // Should NOT have category tick labels A, B, C
    const texts = await testCase.locator("svg text").allTextContents()
    expect(texts).not.toContain("A")
    expect(texts).not.toContain("B")
    expect(texts).not.toContain("C")
  })

  test("swimlane gradient + dashed x-threshold annotation render", async ({ page }) => {
    await waitForChartReady(page, "ord-swimlane-gradient")
    const testCase = page.locator('[data-testid="ord-swimlane-gradient"]')

    // Canvas paints the gradient bar (and the trackFill rect behind it).
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)

    // SVG overlay should carry an x-threshold line with the default
    // dashed pattern. Annotation renders as <line stroke-dasharray="6,3">.
    const dashedLines = testCase.locator('svg line[stroke-dasharray="6,3"]')
    await expect(dashedLines).toHaveCount(1)

    // Visual snapshot — covers gradient stops + threshold position + track.
    await expect(testCase).toHaveScreenshot("ord-swimlane-gradient.png", {
      maxDiffPixels: 200
    })
  })

  test("swimlane gradient renders in sparkline mode with track + threshold", async ({ page }) => {
    await waitForChartReady(page, "ord-swimlane-gradient-sparkline")
    const testCase = page.locator('[data-testid="ord-swimlane-gradient-sparkline"]')

    // Canvas paints the gradient bar (and trackFill) at sparkline dimensions.
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeLessThan(40)

    // Dashed threshold survives the sparkline chrome strip.
    await expect(testCase.locator('svg line[stroke-dasharray="6,3"]')).toHaveCount(1)

    await expect(testCase).toHaveScreenshot("ord-swimlane-gradient-sparkline.png", {
      maxDiffPixels: 200
    })
  })
})

test.describe("Ordinal Charts - Gauge", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  test("180° gauge renders visibly and is vertically centered", async ({ page }) => {
    await waitForChartReady(page, "ord-gauge-180")
    const testCase = page.locator('[data-testid="ord-gauge-180"]')
    await expect(testCase).toHaveScreenshot("ord-gauge-180.png", {
      maxDiffPixels: 100
    })
  })

  test("election needle 180° renders without clipping", async ({ page }) => {
    await waitForChartReady(page, "ord-gauge-needle")
    const testCase = page.locator('[data-testid="ord-gauge-needle"]')
    await expect(testCase).toHaveScreenshot("ord-gauge-needle.png", {
      maxDiffPixels: 100
    })
  })

  test("240° gauge renders visibly and is centered", async ({ page }) => {
    await waitForChartReady(page, "ord-gauge-240")
    const testCase = page.locator('[data-testid="ord-gauge-240"]')
    await expect(testCase).toHaveScreenshot("ord-gauge-240.png", {
      maxDiffPixels: 100
    })
  })
})

// ── Default-theme HOC coverage backfill ──────────────────────────────
// One snapshot per public Ordinal HOC that didn't already have one.
// Mirrors the XY-family backfill (xy-frame.spec.ts).
test.describe("Ordinal Charts - HOC default coverage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ordinal-examples/")
  })

  for (const testId of [
    "ordinal-dotplot",
    "ordinal-ridgeline",
  ]) {
    test(`renders ${testId}`, async ({ page }) => {
      await waitForChartReady(page, testId)
      const testCase = page.locator(`[data-testid="${testId}"]`)
      await expect(testCase).toHaveScreenshot(`${testId}.png`, {
        maxDiffPixels: 100,
      })
    })
  }
})
