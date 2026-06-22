import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForRafs } from "./helpers"

test.describe("Network Charts - Force-Directed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders force-directed graph", async ({ page }) => {
    await waitForChartReady(page, "network-force")
    const testCase = page.locator('[data-testid="network-force"]')
    await expect(testCase).toHaveScreenshot("network-force.png", {
      maxDiffPixels: 200 // Force layouts can have slight variations
    })
  })

  test("shows tooltip on force graph hover", async ({ page }) => {
    await waitForChartReady(page, "network-force-hover")

    const testCase = page.locator('[data-testid="network-force-hover"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()
    if (box) {
      // Hover near the center of the chart where nodes cluster
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await waitForRafs(page)

      await expect(testCase).toHaveScreenshot(
        "network-force-hover-state.png",
        { maxDiffPixels: 200 }
      )
    }
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
    await expect(testCase).toHaveScreenshot("network-widget-annotation.png", {
      maxDiffPixels: 150,
    })
  })
})
