import { test, expect, type Locator } from "@playwright/test"
import { waitForChartReady, waitForRafs, expectTooltipWithinPlot } from "./helpers"

async function hoverPaintedForceNode(chart: Locator) {
  await chart.scrollIntoViewIfNeeded()
  await waitForRafs(chart.page())
  const canvas = chart.locator("canvas").first()
  // Pick a real purple node in the fixture, independent of layout margins.
  const point = await canvas.evaluate((element: HTMLCanvasElement) => {
    const { width, height } = element
    const pixels = element.getContext("2d")!.getImageData(0, 0, width, height).data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        if (pixels[i + 3] > 250 &&
          Math.abs(pixels[i] - 172) < 3 &&
          Math.abs(pixels[i + 1] - 88) < 3 &&
          Math.abs(pixels[i + 2] - 229) < 3) {
          return { x: x / width, y: (y + 4) / height }
        }
      }
    }
    throw new Error("Force graph has no painted purple node")
  })
  const box = await canvas.boundingBox()
  if (!box) throw new Error("Force graph canvas has no bounding box")
  await chart.page().mouse.move(box.x + point.x * box.width, box.y + point.y * box.height)
}

test.describe("Network Charts - Force-Directed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders force-directed graph", async ({ page }) => {
    await waitForChartReady(page, "network-force")
    const testCase = page.locator('[data-testid="network-force"]')
    await expect(testCase).toHaveScreenshot("network-force.png", {
      // Force layouts settle to deterministic positions (d3-force LCG, no
      // intro animation here), but the canvas rasterization of the node
      // circles + edges carries host-dependent anti-aliasing variance — the
      // same `-noble` image renders ~500px differently across CI hosts,
      // strongest on WebKit. This tolerance absorbs that AA jitter while
      // staying far below the thousands of pixels a real layout regression
      // (wrong positions) would move on this 5-node graph.
      maxDiffPixels: 900
    })
  })

  test("shows tooltip on force graph hover", async ({ page }) => {
    await waitForChartReady(page, "network-force-hover")

    const testCase = page.locator('[data-testid="network-force-hover"]')
    const tooltip = testCase.locator(".stream-network-tooltip")
    const margin = { left: 40, right: 40, top: 40, bottom: 40 }
    await hoverPaintedForceNode(testCase)
    await expect(tooltip).toContainText(/Node [A-E]/)
    await expectTooltipWithinPlot(testCase, margin)
    const content = await tooltip.innerText()

    await expect(testCase).toHaveScreenshot(
      "network-force-hover-state.png",
      // Same host-dependent AA variance as the static force graph above,
      // plus the hover tooltip — keep the tolerance aligned.
      { maxDiffPixels: 900 }
    )
    await expect(tooltip).toHaveText(content, { useInnerText: true })

    await page.setViewportSize({ width: 720, height: 700 })
    await hoverPaintedForceNode(testCase)
    await expect(tooltip).toHaveText(content, { useInnerText: true })
    await expectTooltipWithinPlot(testCase, margin)
    await page.mouse.move(0, 0)
    await expect(tooltip).toBeHidden()
  })
})

test.describe("Network Charts - Hierarchical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders tree diagram", async ({ page }) => {
    await waitForChartReady(page, "network-tree")
    const testCase = page.locator('[data-testid="network-tree"]')
    await expect(testCase).toHaveScreenshot("network-tree.png", {
      maxDiffPixels: 100
    })
  })

  test("renders treemap", async ({ page }) => {
    await waitForChartReady(page, "network-treemap")
    const testCase = page.locator('[data-testid="network-treemap"]')
    await expect(testCase).toHaveScreenshot("network-treemap.png", {
      maxDiffPixels: 100
    })
  })

  test("renders circle pack", async ({ page }) => {
    await waitForChartReady(page, "network-circlepack")
    const testCase = page.locator('[data-testid="network-circlepack"]')
    await expect(testCase).toHaveScreenshot("network-circlepack.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("Network Charts - Flow Layouts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders sankey diagram", async ({ page }) => {
    await waitForChartReady(page, "network-sankey")
    const testCase = page.locator('[data-testid="network-sankey"]')
    await expect(testCase).toHaveScreenshot("network-sankey.png", {
      maxDiffPixels: 100
    })
  })

  test("renders chord diagram", async ({ page }) => {
    await waitForChartReady(page, "network-chord")
    const testCase = page.locator('[data-testid="network-chord"]')
    await expect(testCase).toHaveScreenshot("network-chord.png", {
      maxDiffPixels: 100
    })
  })
})

// ── Default-theme HOC coverage backfill ──────────────────────────────
// OrbitDiagram pinned to `animated: false` so the orbital animation
// is frozen and the canvas is pixel-stable for the snapshot. Mirrors
// the realtime-static pattern: turn off the continuous redraw, take
// the snapshot of the resting layout.
test.describe("Network Charts - HOC default coverage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders network-orbit", async ({ page }) => {
    await waitForChartReady(page, "network-orbit")
    const testCase = page.locator('[data-testid="network-orbit"]')
    await expect(testCase).toHaveScreenshot("network-orbit.png", {
      maxDiffPixels: 100,
    })
  })

  test("renders network widget annotation", async ({ page }) => {
    await waitForChartReady(page, "network-widget-annotation")
    const testCase = page.locator('[data-testid="network-widget-annotation"]')
    const frame = testCase.locator(".stream-network-frame")
    const widget = testCase.locator(".annotation-deferred")
    await expect(testCase.locator('[data-testid="network-widget-content"]')).toHaveText("Network note")
    await expect(widget).toHaveCSS("opacity", "0")
    await expect(widget).toHaveCSS("pointer-events", "none")
    await frame.hover({ position: { x: 12, y: 12 } })
    await expect(widget).toHaveCSS("opacity", "1")
    await expect(widget).toHaveCSS("pointer-events", "auto")
    await expect(testCase.locator('[data-testid="network-widget-content"]')).toHaveScreenshot("network-widget-content-visible.png", {
      maxDiffPixels: 20,
    })
  })
})
