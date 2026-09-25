import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForRafs } from "./helpers"

declare global {
  interface Window {
    __physicsChartHandles: {
      galton?: {
        getCustomLayout: () => {
          queue: unknown[]
          world: { bodies: Array<{ id: string; x: number; y: number }> }
        }
      }
    }
  }
}

const PHYSICS_CASES = [
  ["physics-galton-settled", "physics-galton-settled.png"],
  ["physics-eventdrop-settled", "physics-eventdrop-settled.png"],
  ["physics-pile-settled", "physics-pile-settled.png"],
] as const

test.describe("Physics charts - settled-state baselines", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/physics-examples/")
  })

  test("settled body hover shows its data at both plot edges and dismisses", async ({ page }) => {
    await expect.poll(() => page.evaluate(() =>
      window.__physicsChartHandles.galton?.getCustomLayout().world.bodies.length
    )).toBe(16)
    const bodies = await page.evaluate(() => {
      const snapshot = window.__physicsChartHandles.galton!.getCustomLayout()
      return { queued: snapshot.queue.length, bodies: snapshot.world.bodies }
    })
    expect(bodies.queued).toBe(0)
    const sorted = bodies.bodies.sort((a, b) => a.x - b.x)
    const frame = page.getByTestId("physics-galton-settled").locator(".stream-physics-frame")
    const canvas = frame.locator("canvas").first()
    const tooltip = frame.locator(".stream-physics-tooltip")

    for (const body of [sorted[0], sorted[sorted.length - 1]]) {
      await canvas.hover({ position: { x: body.x, y: body.y } })
      await expect(tooltip).toContainText(body.id)
      const chartBounds = (await frame.boundingBox())!
      const tipBounds = (await tooltip.boundingBox())!
      expect(tipBounds.x).toBeGreaterThanOrEqual(chartBounds.x)
      expect(tipBounds.y).toBeGreaterThanOrEqual(chartBounds.y)
      expect(tipBounds.x + tipBounds.width).toBeLessThanOrEqual(chartBounds.x + chartBounds.width)
      expect(tipBounds.y + tipBounds.height).toBeLessThanOrEqual(chartBounds.y + chartBounds.height)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
    }
  })

  for (const [testId, snapshotName] of PHYSICS_CASES) {
    test(`renders ${testId}`, async ({ page }) => {
      await waitForChartReady(page, testId, { timeout: 15_000 })
      await waitForRafs(page, 2)
      const testCase = page.locator(`[data-testid="${testId}"]`)
      if (testId === "physics-galton-settled") {
        await expect(
          testCase.getByTestId("galton-board-structure-overlay").locator("text")
        ).toHaveText(["4", "1", "2", "2", "3", "4"])
      } else if (testId === "physics-eventdrop-settled") {
        // All eleven arrivals precede closure. The final watermark must not
        // retroactively reject the five events in now-closed windows.
        await expect(
          testCase.getByTestId("event-drop-window-overlay").locator("text")
        ).toHaveText([
          "0 late", "3", "0-10", "2", "10-20", "3", "20-30",
          "3", "30-40", "0", "40-50", "watermark 26",
        ])
      } else if (testId === "physics-pile-settled") {
        const projection = testCase.getByTestId("physics-pile-projection-overlay")
        await expect(projection.locator("g text")).toHaveText([
          "9", "North", "6", "South", "12", "East", "7", "West",
        ])
        await expect(projection.locator(":scope > text")).toHaveText(
          "Full circle = 1; partial circles scaled by area"
        )
      }
      await expect(testCase).toHaveScreenshot(snapshotName, {
        maxDiffPixels: 200,
        timeout: 15_000,
      })
    })
  }
})
