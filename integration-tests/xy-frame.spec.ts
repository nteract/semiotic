import { test, expect, type Page } from "@playwright/test"
import { waitForChartReady, waitForRafs } from "./helpers"

async function hoverAndScreenshotMultiTooltip(
  page: Page,
  testId: string,
  snapshotName: string
) {
  await waitForChartReady(page, testId)
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await testCase.scrollIntoViewIfNeeded()
  await waitForRafs(page, 2)

  const canvas = testCase.locator("canvas").first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error("canvas bounding box unavailable")

  // Hover near the middle of the rendered x range, away from the explicit
  // sample points. `tooltip="multi"` should still resolve every series at
  // the cursor's x position.
  await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.5)
  await waitForRafs(page, 6)

  const tooltip = testCase.locator(".stream-frame-tooltip .semiotic-tooltip")
  await expect(tooltip).toHaveCSS("display", /^(?!none$).+/, { timeout: 2000 })
  await expect(tooltip).toHaveCSS("visibility", "visible")
  await expect(tooltip).toContainText("A")
  await expect(tooltip).toContainText("B")

  await expect(testCase).toHaveScreenshot(snapshotName, {
    maxDiffPixels: 300,
  })
}

test.describe("XY Charts - Line Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders line chart", async ({ page }) => {
    await waitForChartReady(page, "xy-line")
    const testCase = page.locator('[data-testid="xy-line"]')
    await expect(testCase).toHaveScreenshot("xy-line.png", {
      maxDiffPixels: 100
    })
  })

  test("renders line chart with points", async ({ page }) => {
    await waitForChartReady(page, "xy-line-points")
    const testCase = page.locator('[data-testid="xy-line-points"]')
    await expect(testCase).toHaveScreenshot("xy-line-points.png", {
      maxDiffPixels: 100
    })
  })

  test("renders line chart with fill area", async ({ page }) => {
    await waitForChartReady(page, "xy-line-fill")
    const testCase = page.locator('[data-testid="xy-line-fill"]')
    await expect(testCase).toHaveScreenshot("xy-line-fill.png", {
      maxDiffPixels: 100
    })
  })

  // AreaChart yExtent regression fixtures — single-series so the fill
  // baseline anchors at the y-domain min and the override is visible.
  // Stacked-area's cumulative-sum auto-extension is exercised
  // separately via the pipeline-store unit tests.
  for (const variant of ["both", "min", "max"] as const) {
    test(`renders area chart with yExtent (${variant})`, async ({ page }) => {
      const id = `xy-area-yextent-${variant}`
      await waitForChartReady(page, id)
      const testCase = page.locator(`[data-testid="${id}"]`)
      await expect(testCase).toHaveScreenshot(`${id}.png`, { maxDiffPixels: 100 })
    })
  }

  // LineChart accepts both `xExtent` and `yExtent` as top-level props in
  // three shapes — [min, max], [min, undefined], [undefined, max]. The
  // 6 fixtures (axis × shape) lock in pixel-stable snapshots; without
  // these a regression dropping the pass-through to the frame would
  // silently render at the data-derived domain instead of the override
  // (the bug that originally surfaced this gap on AreaChart).
  for (const axis of ["yExtent", "xExtent"] as const) {
    for (const variant of ["both", "min", "max"] as const) {
      test(`renders line chart with ${axis} (${variant})`, async ({ page }) => {
        const id = `xy-line-${axis.toLowerCase()}-${variant}`
        await waitForChartReady(page, id)
        const testCase = page.locator(`[data-testid="${id}"]`)
        await expect(testCase).toHaveScreenshot(`${id}.png`, { maxDiffPixels: 100 })
      })
    }
  }
})

test.describe("XY Charts - Area Charts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders area chart", async ({ page }) => {
    await waitForChartReady(page, "xy-area")
    const testCase = page.locator('[data-testid="xy-area"]')
    await expect(testCase).toHaveScreenshot("xy-area.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("XY Charts - Scatter and Bubble", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders scatter plot", async ({ page }) => {
    await waitForChartReady(page, "xy-scatter")
    const testCase = page.locator('[data-testid="xy-scatter"]')
    await expect(testCase).toHaveScreenshot("xy-scatter.png", {
      maxDiffPixels: 100
    })
  })

  test("renders bubble chart", async ({ page }) => {
    await waitForChartReady(page, "xy-bubble")
    const testCase = page.locator('[data-testid="xy-bubble"]')
    await expect(testCase).toHaveScreenshot("xy-bubble.png", {
      maxDiffPixels: 100
    })
  })

  test("renders auto-placed annotations without edge collisions", async ({ page }) => {
    await waitForChartReady(page, "xy-annotation-auto-place")
    const testCase = page.locator('[data-testid="xy-annotation-auto-place"]')

    const geometry = await testCase.evaluate((container) => {
      const chartRect = container.getBoundingClientRect()
      const labels = Array.from(container.querySelectorAll("svg text")).map((node) => {
        const rect = node.getBoundingClientRect()
        return {
          text: node.textContent ?? "",
          left: rect.left - chartRect.left,
          right: rect.right - chartRect.left,
          top: rect.top - chartRect.top,
          bottom: rect.bottom - chartRect.top,
        }
      })
      return { width: chartRect.width, height: chartRect.height, labels }
    })
    if (geometry.width <= 0 || geometry.height <= 0) {
      throw new Error("Expected xy-annotation-auto-place chart to have a layout box")
    }
    const { labels } = geometry
    const edge = labels.find((label) => label.text.includes("Edge"))
    const center = labels.find((label) => label.text.includes("Center A"))
    if (!edge || !center) {
      throw new Error("Expected auto-placed Edge and Center A annotation labels")
    }
    for (const label of [edge, center]) {
      expect(label.left).toBeGreaterThanOrEqual(-1)
      expect(label.right).toBeLessThanOrEqual(geometry.width + 1)
      expect(label.top).toBeGreaterThanOrEqual(-1)
      expect(label.bottom).toBeLessThanOrEqual(geometry.height + 1)
    }
    const labelsOverlap =
      edge.left < center.right &&
      center.left < edge.right &&
      edge.top < center.bottom &&
      center.top < edge.bottom
    expect(labelsOverlap).toBe(false)
    await expect(testCase).toHaveScreenshot("xy-annotation-auto-place.png", {
      maxDiffPixels: 150
    })
  })
})

test.describe("XY Charts - Interactivity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("shows tooltip on scatter hover", async ({ page }) => {
    await waitForChartReady(page, "xy-scatter-hover")

    const testCase = page.locator('[data-testid="xy-scatter-hover"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover near the center of the chart
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await waitForRafs(page)

      await expect(testCase).toHaveScreenshot("xy-scatter-hover-state.png", {
        maxDiffPixels: 150
      })
    }
  })
})

test.describe("XY Charts - Landmark Ticks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders date tick labels with landmark styling, not Dec 31", async ({ page }) => {
    await waitForChartReady(page, "xy-landmark-ticks")
    const testCase = page.locator('[data-testid="xy-landmark-ticks"]')

    // Axis labels are part of the SVG overlay, which lands in a separate
    // React commit after the canvas paints. Webkit in particular finishes
    // canvas painting before the first SVG text node is attached, so poll
    // until at least one Jan/Feb/Mar tick is in the DOM before sampling.
    await expect.poll(
      async () => (await testCase.locator("svg text").allTextContents())
        .filter(t => /Jan|Feb|Mar/.test(t)).length,
      { timeout: 5000 }
    ).toBeGreaterThan(2)

    const texts = await testCase.locator("svg text").allTextContents()
    const dateLabels = texts.filter(t => /Jan|Feb|Mar/.test(t))
    expect(dateLabels.length).toBeGreaterThan(2)

    // No labels should say "Dec 31" (which means scaleLinear was used instead of scaleTime)
    const dec31 = texts.filter(t => t.includes("Dec 31"))
    expect(dec31.length).toBe(0)

    // No labels should reference 1969/1970 (epoch fallback)
    const epoch = texts.filter(t => /196[89]|1970/.test(t))
    expect(epoch.length).toBe(0)
  })
})

test.describe("XY Charts - Auto-Rotate Labels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders distinct tick labels when autoRotate is set", async ({ page }) => {
    await waitForChartReady(page, "xy-auto-rotate")
    const testCase = page.locator('[data-testid="xy-auto-rotate"]')

    // Wait for the SVG overlay to paint its labels (separate React commit
    // from the canvas paint that `waitForChartReady` gates on).
    await expect.poll(
      async () => (await testCase.locator("svg text").allTextContents())
        .filter(t => /January|February|March/.test(t)).length,
      { timeout: 5000 }
    ).toBeGreaterThan(2)

    const texts = await testCase.locator("svg text").allTextContents()
    const dateLabels = texts.filter(t => /January|February|March/.test(t))
    expect(dateLabels.length).toBeGreaterThan(2)

    // All date labels must be DISTINCT — no duplicates
    const uniqueLabels = new Set(dateLabels)
    expect(uniqueLabels.size).toBe(dateLabels.length)
  })
})

test.describe("XY Charts - Range Plot", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("renders range/dumbbell plot with visible marks", async ({ page }) => {
    await waitForChartReady(page, "xy-range-plot")
    const testCase = page.locator('[data-testid="xy-range-plot"]')

    // Take a screenshot for visual verification
    await expect(testCase).toHaveScreenshot("xy-range-plot.png", {
      maxDiffPixels: 100
    })

    // The canvas should have non-trivial content (not blank)
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.height).toBeGreaterThan(100)

    // Check that axes rendered (SVG text elements)
    const texts = await testCase.locator("svg text").allTextContents()
    expect(texts.length).toBeGreaterThan(2)
  })
})

// ── Default-theme HOC coverage backfill ──────────────────────────────
// One snapshot per public XY HOC that didn't already have one. Pinned
// to the default theme; theme variants are covered by themed-charts.
// Linux baselines auto-generate via the CI smoke-fallback step; commit
// from the `playwright-snapshots` artifact to flip the regression gate
// on for CI.
test.describe("XY Charts - HOC default coverage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  for (const testId of [
    "xy-stacked-area",
    "xy-connected-scatter",
    "xy-quadrant",
    "xy-multi-axis-line",
    "xy-scatter-matrix",
    "xy-minimap",
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

// ── Interaction-state visual snapshots ──────────────────────────────
// Closes the "Interaction-State Visual Snapshots" P1 item for the XY
// family. Each test drives the chart into a non-default visual state
// (hoverHighlight dimming, brush selection rect, legend-isolate),
// `waitForRafs` to settle the React commit, then snapshots. Higher
// `maxDiffPixels` than default-state tests because pointer-driven
// states have more anti-aliased motion edges.
test.describe("XY Charts - Interaction states", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/")
  })

  test("hoverHighlight dims non-hovered series", async ({ page }) => {
    await waitForChartReady(page, "xy-hover-highlight")
    const testCase = page.locator('[data-testid="xy-hover-highlight"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error("canvas bounding box unavailable")
    // Hover at x≈1 in data space (25% of chart width since lineData
    // spans x=0..4) where series A (15) clearly dominates series B
    // (8). The midpoint at x=2 is intentionally avoided — that's the
    // one data x where B (13) is slightly above A (12), so a midpoint
    // hover would resolve ambiguously across rendered geometry.
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25)
    await waitForRafs(page, 4)
    await expect(testCase).toHaveScreenshot("xy-hover-highlight.png", {
      maxDiffPixels: 200,
    })
  })

  test("brush selection draws a rect on drag", async ({ page }) => {
    await waitForChartReady(page, "xy-brush")
    const testCase = page.locator('[data-testid="xy-brush"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error("canvas bounding box unavailable")
    // Drag a rectangular selection across the middle 60% of the chart.
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 10 })
    await page.mouse.up()
    await waitForRafs(page, 4)
    await expect(testCase).toHaveScreenshot("xy-brush.png", {
      maxDiffPixels: 200,
    })
  })

  test("legend isolate dims un-clicked series", async ({ page }) => {
    await waitForChartReady(page, "xy-legend-isolate")
    const testCase = page.locator('[data-testid="xy-legend-isolate"]')
    // Click the legend swatch labeled "A" — `legendInteraction:
    // "isolate"` should dim series B, leaving A at full opacity.
    // Locate by visible label rather than `.first()` so adding
    // a third series later (or changing legend sort order) doesn't
    // silently isolate the wrong one.
    const legendSwatch = testCase.locator(".legend-item", { hasText: "A" }).first()
    await legendSwatch.click()
    await waitForRafs(page, 4)
    await expect(testCase).toHaveScreenshot("xy-legend-isolate.png", {
      maxDiffPixels: 200,
    })
  })

  for (const { testId, name, snapshot } of [
    {
      testId: "xy-line-multi-tooltip",
      name: "line chart",
      snapshot: "xy-line-multi-tooltip-hover.png",
    },
    {
      testId: "xy-area-multi-tooltip",
      name: "area chart",
      snapshot: "xy-area-multi-tooltip-hover.png",
    },
    {
      testId: "xy-stacked-area-multi-tooltip",
      name: "stacked area chart",
      snapshot: "xy-stacked-area-multi-tooltip-hover.png",
    },
  ]) {
    test(`${name} multi tooltip appears away from explicit points`, async ({ page }) => {
      await hoverAndScreenshotMultiTooltip(page, testId, snapshot)
    })
  }
})
