import { test, expect } from "@playwright/test"
import { waitForAllChartsReady } from "./helpers"

const requiredCanvasCharts = ["xy-line", "xy-area", "xy-scatter", "xy-stacked-area"]

type CanvasChartSummary = {
  id: string
  hasContainer: boolean
  hasDataCanvas: boolean
  width: number
  height: number
  painted: boolean
}

function summarizeCanvasCharts(ids: string[]): CanvasChartSummary[] {
  return ids.map(id => {
    const container = document.querySelector(`[data-testid="${id}"]`)
    const canvas = container?.querySelector("canvas[aria-label]") as HTMLCanvasElement | null
    let painted = false

    if (canvas && canvas.width > 0 && canvas.height > 0) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        try {
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
          for (let i = 0; i < data.length; i += 16) {
            const alpha = data[i + 3]
            if (alpha <= 10) continue
            if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) continue
            painted = true
            break
          }
        } catch {
          painted = false
        }
      }
    }

    return {
      id,
      hasContainer: Boolean(container),
      hasDataCanvas: Boolean(canvas),
      width: canvas?.width ?? 0,
      height: canvas?.height ?? 0,
      painted
    }
  })
}

test("xy-examples page mounts charts without runtime errors", async ({ page }) => {
  const errors: string[] = []
  const consoleErrors: string[] = []

  page.on("pageerror", err => errors.push(err.message))
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text())
    }
  })

  await page.goto("/xy-examples/")
  await waitForAllChartsReady(page)

  const testCases = await page.locator('[data-testid]').count()
  const canvases = await page.locator("canvas").count()
  const dataCanvases = await page.locator("canvas[aria-label]").count()

  expect(errors).toEqual([])
  expect(consoleErrors).toEqual([])
  expect(testCases).toBeGreaterThan(10)
  expect(canvases).toBeGreaterThan(0)
  expect(dataCanvases).toBeGreaterThan(0)

  const chartSummaries = await page.evaluate(summarizeCanvasCharts, requiredCanvasCharts)
  for (const summary of chartSummaries) {
    expect(summary).toEqual(expect.objectContaining({
      hasContainer: true,
      hasDataCanvas: true,
      painted: true
    }))
    expect(summary.width).toBeGreaterThan(0)
    expect(summary.height).toBeGreaterThan(0)
  }
})
