import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForAllChartsReady, waitForRafs } from "./helpers"

test.describe("Brush & Selection - Coordinated hover", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  test("linked hover dashboard renders multiple chart canvases", async ({ page }) => {
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // Each chart should have at least 1 canvas (data + interaction layer)
    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test("hovering over scatter chart does not crash linked charts", async ({ page }) => {
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover across the chart area
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25)
      await waitForRafs(page)
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
      await waitForRafs(page)
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75)
      await waitForRafs(page)

      // All canvases should still be visible (no crash from linked updates)
      const canvases = testCase.locator("canvas")
      const count = await canvases.count()
      expect(count).toBeGreaterThanOrEqual(2)
    }
  })

  test("moving mouse off chart clears hover state without error", async ({ page }) => {
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover into chart
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await waitForRafs(page)

      // Move mouse completely away from the chart
      await page.mouse.move(0, 0)
      await waitForRafs(page)

      // Chart should still have its scene drawn — the data canvas's
      // `aria-label` carries a node count from `computeCanvasAriaLabel`
      // and only stays populated when the scene survived the
      // hover-clear path. A blank-canvas regression would empty it.
      const dataCanvas = testCase.locator("canvas[aria-label]").first()
      await expect(dataCanvas).toHaveAttribute("aria-label", /\d+/)
    }
  })
})

test.describe("Brush & Selection - Three-way linked charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  test("three-way linked charts all render canvases", async ({ page }) => {
    await waitForChartReady(page, "three-way-linked")
    const testCase = page.locator('[data-testid="three-way-linked"]')

    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    // 3 charts, each with at least 1 canvas
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test("hover propagation across three linked charts", async ({ page }) => {
    await waitForChartReady(page, "three-way-linked")
    const testCase = page.locator('[data-testid="three-way-linked"]')

    // Find the first chart canvas and hover it
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await waitForRafs(page)

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
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    // CategoryColorProvider + LinkedCharts should produce a unified legend
    const legendItems = testCase.locator(".legend-item")
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test("clicking legend item does not crash chart", async ({ page }) => {
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')

    const legendItems = testCase.locator(".legend-item g")
    const count = await legendItems.count()

    if (count > 0) {
      // Click the first legend item
      await legendItems.first().click()
      await waitForRafs(page)

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
    await waitForChartReady(page, "a11y-coordinated")
    const testCase = page.locator('[data-testid="a11y-coordinated"]')

    const canvases = testCase.locator("canvas")
    const count = await canvases.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test("hover on coordinated scatter does not crash", async ({ page }) => {
    await waitForChartReady(page, "a11y-coordinated")
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
        await waitForRafs(page)
      }

      // Chart should still be intact — assert the data canvas's
      // `aria-label` still carries a populated node count, proving
      // the sweep didn't tear the scene down.
      const dataCanvas = testCase.locator("canvas[aria-label]").first()
      await expect(dataCanvas).toHaveAttribute("aria-label", /\d+/)
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
    await waitForAllChartsReady(page)

    // Trigger some interactions
    const canvases = page.locator("canvas")
    const count = await canvases.count()
    if (count > 0) {
      const box = await canvases.first().boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await waitForRafs(page)
        await page.mouse.move(0, 0)
        await waitForRafs(page)
      }
    }

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })
})

// ── Interaction-state visual snapshot ───────────────────────────────
// Covers the linked-hover cross-highlight: hovering one chart in the
// `LinkedCharts` group should dim the non-matching categories in the
// sibling chart. The existing structural tests confirm the wiring is
// alive; this snapshot pins the visual state so a regression in the
// `selection` consumer or `wrapStyleWithSelection` opacity dim would
// surface as a pixel diff.
test.describe("Brush & Selection - Visual snapshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coordinated-examples/")
  })

  test("linked-hover dims non-matching categories on sibling chart", async ({ page }) => {
    await waitForChartReady(page, "linked-hover")
    const testCase = page.locator('[data-testid="linked-hover"]')
    // The first canvas in the linked-hover fixture is the scatter on
    // the left; hovering it triggers the bar-chart selection dim.
    const scatterCanvas = testCase.locator("canvas").first()
    const box = await scatterCanvas.boundingBox()
    if (!box) throw new Error("scatter canvas bounding box unavailable")
    // Hover toward the upper-left where the "North" region cluster
    // sits in the seeded fixture data — the bars for "South" and
    // "East" should dim in the sibling chart.
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await waitForRafs(page, 4)
    await expect(testCase).toHaveScreenshot("linked-hover-state.png", {
      maxDiffPixels: 200,
    })
  })

  test("linked-hover dims XY series targets", async ({ page }) => {
    await waitForChartReady(page, "xy-linked-hover")
    const testCase = page.locator('[data-testid="xy-linked-hover"]')
    await testCase.scrollIntoViewIfNeeded()
    const sourceCanvas = testCase.locator("canvas").first()
    const box = await sourceCanvas.boundingBox()
    if (!box) throw new Error("xy linked-hover source canvas bounding box unavailable")
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await waitForRafs(page, 4)
    await expect(testCase).toHaveScreenshot("linked-hover-xy-series-state.png", {
      maxDiffPixels: 260,
    })
  })

  test("linked-hover dims ordinal composition targets", async ({ page }) => {
    await waitForChartReady(page, "ordinal-linked-hover")
    const testCase = page.locator('[data-testid="ordinal-linked-hover"]')
    await testCase.scrollIntoViewIfNeeded()
    const sourceCanvas = testCase.locator("canvas").first()
    const box = await sourceCanvas.boundingBox()
    if (!box) throw new Error("ordinal linked-hover source canvas bounding box unavailable")
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await waitForRafs(page, 4)
    await expect(testCase).toHaveScreenshot("linked-hover-ordinal-state.png", {
      maxDiffPixels: 320,
    })
  })

  test("linked-hover dims statistical ordinal targets", async ({ page }) => {
    await waitForChartReady(page, "statistical-linked-hover")
    const testCase = page.locator('[data-testid="statistical-linked-hover"]')
    await testCase.scrollIntoViewIfNeeded()
    const sourceCanvas = testCase.locator("canvas").first()
    const box = await sourceCanvas.boundingBox()
    if (!box) throw new Error("statistical linked-hover source canvas bounding box unavailable")
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await waitForRafs(page, 4)
    await expect(testCase).toHaveScreenshot("linked-hover-statistical-state.png", {
      maxDiffPixels: 360,
    })
  })

  test("linked-hover click lock persists x-position crosshair", async ({ page }) => {
    await waitForChartReady(page, "linked-crosshair-lock")
    const testCase = page.locator('[data-testid="linked-crosshair-lock"]')
    await testCase.scrollIntoViewIfNeeded()
    const sourceCanvas = testCase.locator("canvas").first()
    const box = await sourceCanvas.boundingBox()
    if (!box) throw new Error("linked crosshair source canvas bounding box unavailable")
    const plotMargin = 20
    const plotWidth = box.width - plotMargin * 2
    const plotHeight = box.height - plotMargin * 2
    const hoverLine = testCase.locator('line[stroke*="semiotic-text-secondary"]')
    let lockPoint: { x: number; y: number } | null = null
    for (const yFraction of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      for (const xFraction of [0.5, 0.35, 0.65, 0.2, 0.8]) {
        const x = box.x + plotMargin + plotWidth * xFraction
        const y = box.y + plotMargin + plotHeight * yFraction
        await page.mouse.move(x, y)
        await waitForRafs(page, 1)
        if ((await hoverLine.count()) > 0) {
          lockPoint = { x, y }
          break
        }
      }
      if (lockPoint) break
    }
    if (!lockPoint) throw new Error("linked crosshair hover line did not render before lock")
    await page.mouse.click(lockPoint.x, lockPoint.y)
    await waitForRafs(page, 2)
    await page.mouse.move(0, 0)
    await waitForRafs(page, 4)
    await expect(testCase.locator('line[stroke="white"]')).toHaveCount(1)
    await expect(testCase).toHaveScreenshot("linked-hover-crosshair-locked-state.png", {
      maxDiffPixels: 220,
    })
  })
})
